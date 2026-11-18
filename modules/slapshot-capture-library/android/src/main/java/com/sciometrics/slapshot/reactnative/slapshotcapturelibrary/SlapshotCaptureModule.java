package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary;

import static com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.SerializationUtility.toWriteableMap;

import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.uimanager.UIManagerModule;
import com.sciometrics.android.slapshot.api.capture.CaptureError;
import com.sciometrics.android.slapshot.api.capture.CaptureRequestType;
import com.sciometrics.android.slapshot.api.capture.EncodingType;
import com.sciometrics.android.slapshot.api.capture.FingerType;
import com.sciometrics.android.slapshot.api.capture.FpCondition;
import com.sciometrics.android.slapshot.api.capture.IBiometricPayload;
import com.sciometrics.android.slapshot.api.capture.ICaptureIdentity;
import com.sciometrics.android.slapshot.api.capture.ICaptureRequest;
import com.sciometrics.android.slapshot.api.capture.ICaptureRequestSequence;
import com.sciometrics.android.slapshot.api.capture.ICaptureRequestSequenceBuilder;
import com.sciometrics.android.slapshot.api.capture.ICaptureStatusCallback;
import com.sciometrics.android.slapshot.api.capture.IExportCaptureRequest;
import com.sciometrics.android.slapshot.api.capture.ISlapshotCaptureEngine;
import com.sciometrics.android.slapshot.api.capture.InitializationCallback;
import com.sciometrics.android.slapshot.api.capture.SlapshotCaptureSDK;
import com.sciometrics.android.slapshot.api.capture.UserMode;
import com.sciometrics.core.util.CancelToken;
import com.sciometrics.core.util.Procedure;
import com.sciometrics.core.util.SlapshotException;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.CaptureBiometricsRequestDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.DigitalLiftExportOptionsDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.FaceExportOptionsDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.ReviewBiometricsRequestDto;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SlapshotCaptureModule
        extends ReactContextBaseJavaModule
        implements LifecycleEventListener {
    public static final String NAME = "SlapshotCaptureModule";
    public static final String EXPORT_PROGRESS_EVENT_NAME = "eventExportProgress";
    private static final Object mLock = new Object();
    private static boolean mInitialized = false;
    private static String mInitializationError = null;
    private static Bundle mSavedInstanceState = null;
    private static Callback mOnErrorCallback;
    private static Callback mCalibrationOnSuccessCallback;
    private static Callback mCaptureOnSuccessCallback;
    private static final ICaptureStatusCallback mCaptureStatusCallback = new ICaptureStatusCallback() {
        @Override
        public void onSuccess(ICaptureIdentity captureIdentity) {
            WritableMap serializedCaptureIdentity = toWriteableMap(captureIdentity);
            synchronized (mLock){
                if (mCaptureOnSuccessCallback != null){
                    mCaptureOnSuccessCallback.invoke(serializedCaptureIdentity);
                    mCaptureOnSuccessCallback = null;
                }
            }
        }

        @Override
        public void onCalibrationSuccess() {
            synchronized (mLock){
                if (mCalibrationOnSuccessCallback != null){
                    mCalibrationOnSuccessCallback.invoke();
                    mCalibrationOnSuccessCallback = null;
                }
            }
        }

        @Override
        public void onError(ICaptureIdentity captureIdentity, CaptureError captureError, String error) {
            onErrorCallbackSafe(captureIdentity, captureError, error);
        }
    };

    SlapshotCaptureModule(ReactApplicationContext context) {
        super(context);
        Log.d("Scio", "Constructing SlapshotCaptureModule");
        context.addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("EXPORT_PROGRESS_EVENT_NAME", EXPORT_PROGRESS_EVENT_NAME);
        return constants;
    }

    @ReactMethod
    public void canRestore(Promise promise) {
        synchronized (mLock) {
            promise.resolve(mSavedInstanceState != null);
        }
    }

    @ReactMethod
    public void configure(ReadableMap readableMap) {
        Log.d("SlapshotCaptureModule", "Running configure");

        try {
            // configure the slapshot capture engine here, once, for the lifetime of the application.
            SlapshotCaptureSDK.getEngine().configure(SerializationUtility.deserializeConfig(readableMap));
        } catch (SlapshotException e) {
            throw new RuntimeException(e);
        }
    }

    @ReactMethod
    public void init(Promise promise){
        synchronized (mLock){
            while (!mInitialized) {
                try {
                    mLock.wait();
                } catch (InterruptedException ignore) {}
            }

            if (mInitializationError == null)
                promise.resolve(true);
            else
                promise.reject("Initialization Error", mInitializationError);
        }
    }

    @ReactMethod
    public void getVersion(Promise promise) {
        try {
            promise.resolve(SlapshotCaptureSDK.getEngine().getVersion());
        }
        catch (Exception e) {
            promise.reject("An error has occurred while getting version", e);
        }
    }

    @ReactMethod
    public void backPressed(Promise promise){
        runUIMethod(()->{
            String backStateName = SlapshotCaptureSDK.getUIEngine().onBack().name();
            Log.d("Scio", "Back pressed " + backStateName);
            promise.resolve(backStateName);
        });
    }

    @ReactMethod
    public void isLicensed(Promise promise){
        try {
            boolean isLicensed = SlapshotCaptureSDK.getEngine().isLicensed();
            promise.resolve(isLicensed);
        } catch (SlapshotException e) {
            promise.reject("Is Licensed Error", e.getLocalizedMessage());
        }
    }

    @ReactMethod
    public void activateLicenseKey(String licenseKey, Promise promise){
        new Thread(()->{
            try {
                SlapshotCaptureSDK.getEngine().activateLicenseKey(licenseKey);
                getCurrentActivity().runOnUiThread(()->{
                    promise.resolve(true);
                });
            } catch (SlapshotException e) {
                getCurrentActivity().runOnUiThread(()->{
                    promise.reject(e.errorCode.name(), e);
                });
            }
        }).start();
    }

    @ReactMethod
    public void createOfflineLicenseRequest(String licenseKey,Promise promise) {
        new Thread(()->{
            try {
                String request = SlapshotCaptureSDK.getEngine().createOfflineLicenseRequest(licenseKey);
                getCurrentActivity().runOnUiThread(()->{
                    promise.resolve(request);
                });
            }
            catch (SlapshotException e) {
                getCurrentActivity().runOnUiThread(()->{
                    promise.reject(e.errorCode.name(), e);
                });
            }
        }).start();

    }

    @ReactMethod
    public void installLicense(String licenseContent, Promise promise) {
        new Thread(()->{
            try {
                byte[] licenseContentBytes = licenseContent.getBytes();
                SlapshotCaptureSDK.getEngine().installLicense(new ByteArrayInputStream(licenseContentBytes));
                getCurrentActivity().runOnUiThread(()->{
                    promise.resolve(true);
                });
            }
            catch (SlapshotException e) {
                getCurrentActivity().runOnUiThread(()->{
                    promise.reject(e.errorCode.name(), e);
                });
            }
        }).start();
    }

    @ReactMethod
    public void calibrate(int viewId, Callback onError, Callback onSuccess) {
        Log.d("Scio", "Running calibration on view id " + viewId);
        synchronized (mLock){
            mOnErrorCallback = onError;
            mCalibrationOnSuccessCallback = onSuccess;
        }

        runUIMethod(()->{
            try {
                if (!tryRestore(viewId))
                    SlapshotCaptureSDK.getUIEngine().runCalibration(viewId, mCaptureStatusCallback);
            } catch (SlapshotException e) {
                Log.d("Scio", "Running calibration on view error, id:" + viewId);
                e.printStackTrace();
                onErrorCallbackSafe("An unknown calibration error occurred");
            }
        });
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean isCalibrated(){
        try {
            return SlapshotCaptureSDK.getEngine().getIsCalibrated();
        } catch (SlapshotException e) {
            e.printStackTrace();
            return false;
        }
    }

    @ReactMethod
    public void validateCalibration(int viewId, Callback onError, Callback onSuccess) {
        Log.d("Scio", "Running calibration validation on view id " + viewId);
        synchronized (mLock){
            mOnErrorCallback = onError;
            mCalibrationOnSuccessCallback = onSuccess;
        }

        runUIMethod(()->{
            try {
                if (!tryRestore(viewId)) {
                    SlapshotCaptureSDK.getUIEngine().runCalibrationValidation(
                            viewId,
                            3, // number of validation captures
                            mCaptureStatusCallback);
                }
            } catch (SlapshotException e) {
                Log.d("Scio", "Running calibration validation on view error, id:" + viewId);
                e.printStackTrace();
                onErrorCallbackSafe("An unknown calibration validation error occurred");
            }
        });
    }

    @ReactMethod
    public void captureBiometrics(ReadableMap readableMap, Callback onError, Callback onSuccess){
        CaptureBiometricsRequestDto captureBiometricsRequestDto = SerializationUtility.deserializeCaptureBiometricsRequest(readableMap);

        Log.d("Scio", "Running captureBiometrics on view id " + captureBiometricsRequestDto.viewId);

        synchronized (mLock){
            mOnErrorCallback = onError;
            mCaptureOnSuccessCallback = onSuccess;
        }

        runUIMethod(()->{
            try {
                if (!tryRestore(captureBiometricsRequestDto.viewId)) {
                    SlapshotCaptureSDK.getUIEngine().runCaptureSequence(
                            captureBiometricsRequestDto.viewId,
                            captureBiometricsRequestDto.captureRequestSequence,
                            mCaptureStatusCallback);
                }
            } catch (SlapshotException e) {
                Log.d("Scio", "Running capture sequence on view  error, id:" + captureBiometricsRequestDto.viewId);
                e.printStackTrace();
                onErrorCallbackSafe("An unknown capture error occurred");
            }
        });
    }

    @ReactMethod
    public void exportCapturedIdentity(ReadableMap readableMap, Callback onError, Callback onSuccess) {
        new Thread(()->{
            Log.d("Scio", "exportCapturedIdentity - ENTER");
            try {

                IExportCaptureRequest exportCaptureRequest =
                        SerializationUtility.deserializeExportCaptureRequest(readableMap, progress -> {
                            WritableMap params = Arguments.createMap();
                            params.putInt("progress", progress);
                            Log.d("Scio", "Sending progress event " + progress);
                            getReactApplicationContext()
                                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                    .emit(EXPORT_PROGRESS_EVENT_NAME, params);
                        });

                IBiometricPayload biometricPayload =
                        SlapshotCaptureSDK.getEngine().exportCaptureIdentity(exportCaptureRequest, CancelToken.getDefault());

                EncodingType encodingType = SerializationUtility.deserializeEncodingType(readableMap);

                FaceExportOptionsDto faceExportOptions =
                        SerializationUtility.deserializeFaceExportOptions(readableMap.getMap("slapshotCaptureIdentity"));

                DigitalLiftExportOptionsDto digitalLiftExportOptions =
                        SerializationUtility.deserializeDigitalLiftExportOptions(readableMap.getMap("slapshotCaptureIdentity"));

                Log.d("Scio", "exportCapturedIdentity - got biometricPayload");
                onSuccess.invoke(toWriteableMap(biometricPayload, encodingType, faceExportOptions, digitalLiftExportOptions));

            } catch (SlapshotException e) {
                onError.invoke("An export error has occurred", e);
            }
        }).start();
    }

    @ReactMethod
    public void getAllCaptureIdentities(Promise promise) {
        new Thread(() -> {
            try {
                List<ICaptureIdentity> captureIdentities = SlapshotCaptureSDK.getEngine().getAllCaptureIdentities();
                promise.resolve(SerializationUtility.toWriteable(captureIdentities));
            } catch (Exception e) {
                promise.reject("An error has occurred during identity deletion", e);
            }
        }).start();
    }

    @ReactMethod
    public void getCaptureIdentity(String id, Promise promise) {
        new Thread(() -> {
            try {
                ICaptureIdentity captureIdentity = SlapshotCaptureSDK.getEngine().getCaptureIdentity(id);
                if (captureIdentity == null)
                    throw new RuntimeException("No capture identity with id " + id);

                promise.resolve(SerializationUtility.toWriteableMap(captureIdentity));
            }
            catch (Exception e) {
                promise.reject("An error has occurred during identity deletion", e);
            }
        }).start();
    }

    @ReactMethod
    public void deleteCaptureIdentity(ReadableMap readableMap, Promise promise) {
        new Thread(() -> {
            try {
                ICaptureIdentity captureIdentity = SerializationUtility.deserializeCaptureIdentity(readableMap);
                SlapshotCaptureSDK.getEngine().deleteCaptureIdentity(captureIdentity);
                promise.resolve(true);
            }
            catch (Exception e) {
                promise.reject("An error has occurred during identity deletion", e);
            }
        }).start();
    }

    @ReactMethod
    public void deleteAllCaptureIdentities(Promise promise) {
        new Thread(() -> {
            try {
                SlapshotCaptureSDK.getEngine().deleteAllCaptureIdentities();
                promise.resolve(true);
            }
            catch (Exception e) {
                promise.reject("An error has occurred during identities deletion", e);
            }
        }).start();
    }

    @ReactMethod
    public void resetDirectionPrompts(Promise promise) {
        try {
            SlapshotCaptureSDK.getEngine().resetDirectionPrompts();
            promise.resolve(true);
        }
        catch (Exception e) {
            promise.reject("An error has occurred while resetting direction prompts", e);
        }
    }

    @ReactMethod
    public void resetCalibration(Promise promise) {
        try {
            SlapshotCaptureSDK.getEngine().resetCalibration();
            promise.resolve(true);
        }
        catch (Exception e) {
            promise.reject("An error has occurred while resetting calibration", e);
        }
    }

    @ReactMethod
    public void exportCalibration(Promise promise) {
        try {
            SlapshotCaptureSDK.getUIEngine().exportCalibration();
            promise.resolve(true);
        }
        catch (Exception e) {
            promise.reject("An error has occurred while resetting calibration", e);
        }
    }

    @ReactMethod
    public void addModelBasedCalibration(String modelBasedCalibrationContent, Promise promise) {
        try {
            byte[] calibrationBytes = modelBasedCalibrationContent.getBytes(StandardCharsets.UTF_8);
            boolean matches = SlapshotCaptureSDK.getEngine().addModelBasedCalibration(calibrationBytes);
            promise.resolve(matches);
        }
        catch (Exception e) {
            promise.reject("An error has occurred while running addModelBasedCalibration", e);
        }
    }

    @ReactMethod
    public void runReviewCapturedModality(ReadableMap readableMap, Callback onError, Callback onSuccess) {
        ReviewBiometricsRequestDto reviewBiometricsRequestDto = SerializationUtility.deserializeReviewBiometricsRequest(readableMap);

        Log.d("Scio", "Running runReviewCaptureModality on view id " + reviewBiometricsRequestDto.viewId);

        synchronized (mLock){
            mOnErrorCallback = onError;
            mCaptureOnSuccessCallback = onSuccess;
        }

        runUIMethod(()->{
            try {
                if (!tryRestore(reviewBiometricsRequestDto.viewId)) {
                    SlapshotCaptureSDK.getUIEngine().runReviewCapturedModality(
                            reviewBiometricsRequestDto.viewId,
                            reviewBiometricsRequestDto.reviewRequest,
                            mCaptureStatusCallback);
                }
            } catch (SlapshotException e) {
                Log.d("Scio", "Running runReviewCapturedModality on view  error, id:" + reviewBiometricsRequestDto.viewId);
                e.printStackTrace();
                onErrorCallbackSafe("An unknown error occurred");
            }
        });
    }

    @Override
    public void onHostResume() {
        Log.d("SCIO", "onHostResume");
        SlapshotCaptureSDK.getUIEngine().resume();
    }

    @Override
    public void onHostPause() {
        Log.d("SCIO", "onHostPause");
    }

    @Override
    public void onHostDestroy() {
        Log.d("SCIO", "onHostDestroy");
        SlapshotCaptureSDK.getUIEngine().destroy();
    }

    @ReactMethod
    public void addListener(String eventName) {

    }

    @ReactMethod
    public void removeListeners(Integer count) {

    }

    public static void onCreate(FragmentActivity fragmentActivity, Bundle savedInstanceState){
        synchronized (mLock){
            mInitialized = false;
            mInitializationError = null;
            mSavedInstanceState = savedInstanceState;
        }

        SlapshotCaptureSDK.getUIEngine().init(fragmentActivity, new InitializationCallback() {
            @Override
            public void onSuccess() {
                try {
                    onInitialized();
                }
                catch (Exception exception){
                    onInitialized(exception.getLocalizedMessage());
                }
            }

            @Override
            public void onError(String error) {
                Log.e("SCIO", "engine error " + error);
                onInitialized(error);
            }
        });
    }

    public static void onSaveInstanceState(@NonNull Bundle outState){
        SlapshotCaptureSDK.getUIEngine().onSaveInstanceState(outState);
    }

    private static boolean tryRestore(int viewId) {
        Bundle savedInstanceState;
        synchronized (mLock){
            savedInstanceState = mSavedInstanceState;
            mSavedInstanceState = null;
        }
        if (savedInstanceState != null){
            try {
                Log.d("Scio", "tryRestore true");
                return SlapshotCaptureSDK.getUIEngine().restore(savedInstanceState, viewId, mCaptureStatusCallback);
            } catch (SlapshotException e) {
                Log.e("Scio", e.getLocalizedMessage());
                throw new RuntimeException(e);
            }
        }

        Log.d("Scio", "tryRestore false");
        return false;
    }

    private static void onInitialized(){
        onInitialized(null);
    }

    private static void onInitialized(String error){
        synchronized (mLock){
            mInitialized = true;
            mInitializationError = error;
            mLock.notifyAll();
        }
    }

    private void runUIMethod(Procedure procedure){
        UIManagerModule uiManager = getReactApplicationContext().getNativeModule(UIManagerModule.class);

        uiManager.addUIBlock(nativeViewHierarchyManager -> {
            procedure.invoke();
        });
    }

    private static void onErrorCallbackSafe(String message) {
        onErrorCallbackSafe(null, CaptureError.Error, message);
    }

    private static void onErrorCallbackSafe(ICaptureIdentity captureIdentity, CaptureError captureError, String error) {
        synchronized (mLock) {
            if (mOnErrorCallback != null) {
                mOnErrorCallback.invoke(
                        toWriteableMap(
                                new SlapshotCaptureError(captureIdentity, captureError, error)
                        ));
                mOnErrorCallback = null;
            }
        }
    }

    private ICaptureRequestSequence createCaptureRequestSequence(ISlapshotCaptureEngine slapshotCaptureEngine,
                                                                 boolean isAdministered){
        // can be populated to have finger conditions preset for the request. If not in the mapping,
        // fingers are assumed to be 'Normal'
        Map<FingerType, FpCondition> missingMap = new HashMap<>();

        // add as many individually configured capture requests to a capture request sequence
        ICaptureRequest lSlapCaptureRequest = slapshotCaptureEngine
                .createNewCaptureRequestBuilder()
                .setCaptureRequestType(CaptureRequestType.LeftSlap)
                .setReviewCapture(true)
                .setMissingFingerMapping(missingMap)
                .build();
        ICaptureRequest rSlapCaptureRequest = slapshotCaptureEngine
                .createNewCaptureRequestBuilder()
                .setCaptureRequestType(CaptureRequestType.RightSlap)
                .setReviewCapture(true)
                .setMissingFingerMapping(missingMap)
                .build();
        ICaptureRequest ltSlapCaptureRequest = slapshotCaptureEngine
                .createNewCaptureRequestBuilder()
                .setCaptureRequestType(CaptureRequestType.SingleFingerCapture)
                .setReviewCapture(true)
                .setMissingFingerMapping(missingMap)
                .setSingleFingerCaptureExplicitType(FingerType.LT)
                .build();
        ICaptureRequest rtSlapCaptureRequest = slapshotCaptureEngine
                .createNewCaptureRequestBuilder()
                .setCaptureRequestType(CaptureRequestType.SingleFingerCapture)
                .setReviewCapture(true)
                .setMissingFingerMapping(missingMap)
                .setSingleFingerCaptureExplicitType(FingerType.RT)
                .build();
        ICaptureRequest thumbsSlapCaptureRequest = slapshotCaptureEngine
                .createNewCaptureRequestBuilder()
                .setCaptureRequestType(CaptureRequestType.ThumbsSlap)
                .setReviewCapture(true)
                .setMissingFingerMapping(missingMap)
                .build();
        ICaptureRequest faceCaptureRequest = slapshotCaptureEngine
                .createNewFaceCaptureRequestBuilder()
                // whether the face is captured in landscape or portrait mode (default false)
                .setIsLandscape(false)
                .setCaptureRequestType(CaptureRequestType.Face)
                .setReviewCapture(true)
                .build();

        // user mode determines how the app is presented to the user (Administered: taking someone else's biometrics, Selfie: taking your own biometrics)
        UserMode userMode = isAdministered ? UserMode.AdministeredCapture : UserMode.SelfCapture;
        ICaptureRequestSequenceBuilder captureRequestSequenceBuilder = slapshotCaptureEngine
                .createNewCaptureRequestSequenceBuilder()
                .addCaptureRequest(lSlapCaptureRequest)
                .addCaptureRequest(rSlapCaptureRequest);
        if(isAdministered)
            captureRequestSequenceBuilder = captureRequestSequenceBuilder
                    .addCaptureRequest(thumbsSlapCaptureRequest);
        else
            captureRequestSequenceBuilder = captureRequestSequenceBuilder
                    .addCaptureRequest(ltSlapCaptureRequest)
                    .addCaptureRequest(rtSlapCaptureRequest);

        return captureRequestSequenceBuilder
                .setUserMode(userMode)
                .build();
    }
}