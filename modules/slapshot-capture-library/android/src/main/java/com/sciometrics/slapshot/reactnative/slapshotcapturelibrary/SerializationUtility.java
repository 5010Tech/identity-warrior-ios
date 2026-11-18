package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sciometrics.android.core.serialization.SerializationHelper;
import com.sciometrics.android.slapshot.api.capture.CaptureEngineMode;
import com.sciometrics.android.slapshot.api.capture.CaptureRequestType;
import com.sciometrics.android.slapshot.api.capture.EncodingType;
import com.sciometrics.android.slapshot.api.capture.FingerType;
import com.sciometrics.android.slapshot.api.capture.FpCondition;
import com.sciometrics.android.slapshot.api.capture.IBiometricMetadata;
import com.sciometrics.android.slapshot.api.capture.IBiometricPayload;
import com.sciometrics.android.slapshot.api.capture.ICaptureEngineConfig;
import com.sciometrics.android.slapshot.api.capture.ICaptureEngineConfigBuilder;
import com.sciometrics.android.slapshot.api.capture.ICaptureEngineFaceConfig;
import com.sciometrics.android.slapshot.api.capture.ICaptureEngineFaceConfigBuilder;
import com.sciometrics.android.slapshot.api.capture.ICaptureIdentity;
import com.sciometrics.android.slapshot.api.capture.ICaptureRequestBuilder;
import com.sciometrics.android.slapshot.api.capture.ICaptureRequestSequenceBuilder;
import com.sciometrics.android.slapshot.api.capture.ICapturedModality;
import com.sciometrics.android.slapshot.api.capture.IDigitalLift;
import com.sciometrics.android.slapshot.api.capture.IExportCaptureRequest;
import com.sciometrics.android.slapshot.api.capture.IExportCaptureRequestBuilder;
import com.sciometrics.android.slapshot.api.capture.IExportProgressCallback;
import com.sciometrics.android.slapshot.api.capture.IFPQualityScore;
import com.sciometrics.android.slapshot.api.capture.IFace;
import com.sciometrics.android.slapshot.api.capture.IFaceCaptureRequestBuilder;
import com.sciometrics.android.slapshot.api.capture.IFingerprint;
import com.sciometrics.android.slapshot.api.capture.IFingerprintLocation;
import com.sciometrics.android.slapshot.api.capture.IImage;
import com.sciometrics.android.slapshot.api.capture.IReviewRequestBuilder;
import com.sciometrics.android.slapshot.api.capture.QualityLevel;
import com.sciometrics.android.slapshot.api.capture.SlapshotCaptureSDK;
import com.sciometrics.android.slapshot.api.capture.TorchSetting;
import com.sciometrics.android.slapshot.api.capture.UserMode;
import com.sciometrics.android.slapshot.api.capture.impl.CaptureIdentity;
import com.sciometrics.android.slapshot.api.capture.impl.CapturedModality;
import com.sciometrics.android.slapshot.core.service.extraction.FpQualityScorerType;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.BiometricMetadataDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.BiometricPayloadDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.CaptureBiometricsRequestDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.CaptureIdentityDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.CapturedModalityDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.DigitalLiftDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.DigitalLiftExportOptionsDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.FPQualityScoreDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.FaceDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.FaceExportOptionsDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.FingerprintDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.FingerprintLocationDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.ImageDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.ReviewBiometricsRequestDto;
import com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos.SlapshotCaptureErrorDto;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class SerializationUtility {

    public static ICaptureIdentity deserializeCaptureIdentity(ReadableMap readableMap) {
        return fromReadableMap(readableMap);
    }

    public static ICaptureEngineConfig deserializeConfig(ReadableMap readableMap) {
        ICaptureEngineConfigBuilder builder = SlapshotCaptureSDK.getEngine().createNewCaptureEngineConfigBuilder();

        trySetInt("captureEngineMode", readableMap, (value) -> builder.setMode(CaptureEngineMode.fromId(value)));
        trySetInt("numberOfRetriesForSlapCapture", readableMap, builder::setNumberOfRetriesForSlapCapture);
        trySetInt("inclusiveFingerprintQualityThreshold", readableMap, builder::setInclusiveFingerprintQualityThreshold);
        trySetInt("numberOfValidFingersRequiredToAccept4Slap", readableMap, builder::setNumberOfValidFingersRequiredToAccept4Slap);
        trySetInt("numberOfValidFingersRequiredToAccept2Slap", readableMap, builder::setNumberOfValidFingersRequiredToAccept2Slap);
        trySetEnum("fpQualityScorerType", readableMap, FpQualityScorerType.class, builder::setFpQualityScorerType);
        trySetBool("enforceFingerValidationOnReview", readableMap, builder::setEnforceFingerValidationOnReview);
        trySetBool("allowFingerPositionAndSizeEditing", readableMap, builder::setAllowFingerPositionAndSizeEditing);
        trySetBool("allowCaptureInitByTap", readableMap, builder::setAllowCaptureInitByTap);
        trySetBool("useModelBasedCalibrationByDefault", readableMap, builder::setUseModelBasedCalibrationByDefault);
        trySetBool("enforceFingerSpreadingForSlapCapture", readableMap, builder::setEnforceFingerSpreadingForSlapCapture);
        trySetBool("showFingersSpreadForSlapCapture", readableMap, builder::setShowFingersSpreadForSlapCapture);
        trySetBool("showFpQualityNames", readableMap, builder::setShowFpQualityNames);
        trySetBool("useQualityLevelColors", readableMap, builder::setUseQualityLevelColors);
        trySetInt("validationCapturesForModelBasedCalibration", readableMap, builder::setValidationCapturesForModelBasedCalibration);
        trySetBool("allowSetMissingFingersDuringCapture", readableMap, builder::setAllowSetMissingFingersDuringCapture);
        trySetClass("fPQualityPluginClass", readableMap, builder::setFPQualityPluginClass);

        tryAddQualityMapsToConfig(builder, readableMap);

        if (readableMap.hasKey("faceConfig")){
            builder.setFaceConfig(deserializeFaceConfig(readableMap.getMap("faceConfig")));
        }

        return builder.build();
    }

    public static CaptureBiometricsRequestDto deserializeCaptureBiometricsRequest(ReadableMap readableMap) {
        int viewId = readableMap.getInt("viewId");

        ICaptureRequestSequenceBuilder builder = SlapshotCaptureSDK.getEngine().createNewCaptureRequestSequenceBuilder();

        ReadableMap captureRequestSequenceMap = readableMap.getMap("captureRequestSequence");

        assert captureRequestSequenceMap != null;
        trySetEnum("userMode", captureRequestSequenceMap, UserMode.class, builder::setUserMode);

        if (captureRequestSequenceMap.hasKey("captureRequests")) {
            ReadableArray captureRequestsArray = captureRequestSequenceMap.getArray("captureRequests");

            assert captureRequestsArray != null;
            for (int i = 0; i < captureRequestsArray.size(); i++) {
                ReadableMap captureRequestMap = captureRequestsArray.getMap(i);

                ICaptureRequestBuilder captureRequestBuilder;
                if (captureRequestMap.hasKey( "isLandscape")) {
                    IFaceCaptureRequestBuilder faceCaptureRequestBuilder = SlapshotCaptureSDK.getEngine().createNewFaceCaptureRequestBuilder();
                    trySetBool("isLandscape", captureRequestMap, faceCaptureRequestBuilder::setIsLandscape);
                    captureRequestBuilder = faceCaptureRequestBuilder;
                }
                else {
                    captureRequestBuilder = SlapshotCaptureSDK.getEngine().createNewCaptureRequestBuilder();
                }

                trySetEnum("captureRequestType", captureRequestMap, CaptureRequestType.class, captureRequestBuilder::setCaptureRequestType);
                trySetBool("reviewCapture", captureRequestMap, captureRequestBuilder::setReviewCapture);
                trySetBool("showCaptureImageInReview", captureRequestMap, captureRequestBuilder::setShowCaptureImageInReview);
                trySetEnum("singleFingerCaptureExplicitType", captureRequestMap, FingerType.class, captureRequestBuilder::setSingleFingerCaptureExplicitType);
                trySetMissingFingerMap(captureRequestMap, captureRequestBuilder);
                trySetBool("allowUserToChangeTorchSetting", captureRequestMap, captureRequestBuilder::setAllowUserToChangeTorchSetting);
                trySetEnum("defaultTorchSetting", captureRequestMap, TorchSetting.class, captureRequestBuilder::setDefaultTorchSetting);

                builder.addCaptureRequest(captureRequestBuilder.build());
            }
        }

        if (captureRequestSequenceMap.hasKey("existingCaptureIdentity")) {
            ReadableMap existingCaptureIdentityMap = captureRequestSequenceMap.getMap("existingCaptureIdentity");
            if (existingCaptureIdentityMap != null) {
                ICaptureIdentity existingCaptureIdentity = fromReadableMap(existingCaptureIdentityMap);
                builder.setExistingCaptureIdentity(existingCaptureIdentity);
            }
        }

        return new CaptureBiometricsRequestDto(viewId, builder.build());
    }

    public static ReviewBiometricsRequestDto deserializeReviewBiometricsRequest(ReadableMap readableMap) {
        int viewId = readableMap.getInt("viewId");

        ReadableMap reviewRequestMap = readableMap.getMap("reviewRequest");
        assert reviewRequestMap != null;

        String identityId = reviewRequestMap.getString("identityId");
        String capturedModalityId = reviewRequestMap.getString("capturedModalityId");
        IReviewRequestBuilder builder = SlapshotCaptureSDK.getEngine().createNewReviewRequestBuilder(identityId, capturedModalityId);

        trySetBool("isMutable", reviewRequestMap,  builder::setIsMutable);
        trySetBool("showImagesInReview", reviewRequestMap,  builder::setShowImagesInReview);

        return new ReviewBiometricsRequestDto(viewId, builder.build());
    }

    public static IExportCaptureRequest deserializeExportCaptureRequest(ReadableMap readableMap, IExportProgressCallback progressCallback) {
        ICaptureIdentity captureIdentity = fromReadableMap(readableMap.getMap("slapshotCaptureIdentity"));

        IExportCaptureRequestBuilder builder =
                SlapshotCaptureSDK.getEngine().createNewExportCaptureRequestBuilder(captureIdentity);
        trySetBool("scaleTo500dpi", readableMap,  builder::setScaleTo500dpi);
        trySetBool("includeSlaps", readableMap,  builder::setIncludeSlaps);
        trySetBool("constrainSlapDimensionsTo1600x1500", readableMap,  builder::setConstrainSlapDimensionsTo1600x1500);

        builder.setProgressCallback(progressCallback);

        return builder.build();
    }

    public static EncodingType deserializeEncodingType(ReadableMap readableMap) {
        return EncodingType.valueOf(readableMap.getString("encodingType"));
    }

    public static DigitalLiftExportOptionsDto deserializeDigitalLiftExportOptions(ReadableMap readableMap) {
        DigitalLiftExportOptionsDto options = new DigitalLiftExportOptionsDto();
        if (readableMap != null && readableMap.hasKey("digitalLiftExportOptions")) {
            ReadableMap digitalLiftExportOptionsMap = readableMap.getMap("digitalLiftExportOptions");
            if (digitalLiftExportOptionsMap != null) {
                trySetEnum("encodingType", digitalLiftExportOptionsMap, EncodingType.class, (value) -> options.encodingType = value);
                trySetBool("exportSource", digitalLiftExportOptionsMap, (value) -> options.exportSource = value);
                trySetEnum("sourceEncodingType", digitalLiftExportOptionsMap, EncodingType.class, (value) -> options.sourceEncodingType = value);
            }
        }
        return options;
    }

    public static FaceExportOptionsDto deserializeFaceExportOptions(ReadableMap readableMap) {
        FaceExportOptionsDto faceExportOptionsDto = new FaceExportOptionsDto();
        if (readableMap != null && readableMap.hasKey("faceExportOptions")) {
            ReadableMap faceExportOptionsMap = readableMap.getMap("faceExportOptions");
            if (faceExportOptionsMap != null) {
                trySetBool("exportCroppedFace", faceExportOptionsMap, (value)-> faceExportOptionsDto.exportCroppedFace = value);
                trySetInt("maxDimension", faceExportOptionsMap, (value) -> faceExportOptionsDto.maxDimension = value);
                trySetEnum("encodingType", faceExportOptionsMap, EncodingType.class, (value) -> faceExportOptionsDto.encodingType = value);
            }
        }

        return faceExportOptionsDto;
    }

    public static ICaptureIdentity fromReadableMap(ReadableMap readableMap) {
        Gson gson = createDefaultGson();

        try {
            JSONObject asJson = convertMapToJson(readableMap);
            CaptureIdentityDto captureIdentity = gson.fromJson(asJson.toString(), CaptureIdentityDto.class);
            return fromDto(captureIdentity);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static WritableMap toWriteableMap(SlapshotCaptureError slapshotCaptureError) {
        return toWriteableMap(toDto(slapshotCaptureError));
    }

    public static WritableArray toWriteable(List<ICaptureIdentity> captureIdentities) {
        List<CaptureIdentityDto> dtos = new ArrayList<>();
        if (captureIdentities != null) {
            for (ICaptureIdentity captureIdentity : captureIdentities) {
                dtos.add(toDto(captureIdentity));
            }
        }

        return toWriteableArray(dtos);
    }

    public static WritableArray toWriteableArray(List<?> objects) {
        JSONArray jsonArray = new JSONArray();
        try {
            for (Object next : objects) {
                jsonArray.put(toJSONObject(next));
            }

            return convertJsonToArray(jsonArray);
        }
        catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }


    public static WritableMap toWriteableMap(ICaptureIdentity captureIdentity) {
        return toWriteableMap(toDto(captureIdentity));
    }

    public static WritableMap toWriteableMap(
            IBiometricPayload biometricPayload,
            EncodingType encodingType,
            FaceExportOptionsDto faceExportOptions,
            DigitalLiftExportOptionsDto digitalLiftExportOptions) {
        return toWriteableMap(toDto(biometricPayload, encodingType, faceExportOptions, digitalLiftExportOptions));
    }

    public static WritableMap toWriteableMap(Object object){
        try {
            return convertJsonToMap(toJSONObject(object));
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }

    private static SlapshotCaptureErrorDto toDto(SlapshotCaptureError slapshotCaptureError) {
        return new SlapshotCaptureErrorDto(
                toDto(slapshotCaptureError.captureIdentity),
                slapshotCaptureError.captureError,
                slapshotCaptureError.error);
    }

    private static CaptureIdentityDto toDto(ICaptureIdentity captureIdentity) {
        return new CaptureIdentityDto(captureIdentity.getId(), toDtos(captureIdentity.getCapturedModalities()));
    }

    private static List<CapturedModalityDto> toDtos(List<ICapturedModality> capturedModalities){
        if (capturedModalities == null)
            return new ArrayList<>();
        List<CapturedModalityDto> dtos = new ArrayList<>();
        for (ICapturedModality capturedModality : capturedModalities){
            dtos.add(toDto(capturedModality));
        }
        return dtos;
    }

    private static CapturedModalityDto toDto(ICapturedModality capturedModality) {
        return new CapturedModalityDto(capturedModality.getId(), capturedModality.getCaptureRequestType());
    }

    private static BiometricPayloadDto toDto(
            IBiometricPayload biometricPayload,
            EncodingType encodingType,
            FaceExportOptionsDto faceExportOptions,
            DigitalLiftExportOptionsDto digitalLiftExportOptions) {
        return new BiometricPayloadDto(
                toDto(biometricPayload.getCaptureIdentity()),
                toFpDtos(biometricPayload.getFingerprints(),encodingType),
                toFaceDtos(biometricPayload.getFaces(), faceExportOptions),
                toDigitalLiftDtos(biometricPayload.getDigitalLifts(), digitalLiftExportOptions));
    }

    private static List<DigitalLiftDto> toDigitalLiftDtos(List<IDigitalLift> digitalLifts, DigitalLiftExportOptionsDto exportOptions) {
        List<DigitalLiftDto> dtos = new ArrayList<>();
        if (digitalLifts != null) {
            for (IDigitalLift digitalLift : digitalLifts) {
                dtos.add(toDto(digitalLift, exportOptions));
            }
        }

        return dtos;
    }

    private static DigitalLiftDto toDto(IDigitalLift digitalLift, DigitalLiftExportOptionsDto exportOptions) {
        return new DigitalLiftDto(digitalLift.getDpi(),
                toDto(digitalLift.getMeta()),
                toDto(digitalLift.createImage(exportOptions.encodingType)),
                toDto(exportOptions.exportSource ? digitalLift.createSrcImage(exportOptions.sourceEncodingType) : null));
    }

    private static List<FaceDto> toFaceDtos(List<IFace> faces, FaceExportOptionsDto faceExportOptions) {
        List<FaceDto> dtos = new ArrayList<>();
        if (faces != null) {
            for (IFace face : faces) {
                dtos.add(toDto(face, faceExportOptions));
            }
        }

        return dtos;
    }

    public static FaceDto toDto(IFace face, FaceExportOptionsDto faceExportOptions) {
        IImage image = face.createImage(faceExportOptions.maxDimension, faceExportOptions.exportCroppedFace, faceExportOptions.encodingType);
        return new FaceDto(toDto(image));
    }

    private static List<FingerprintDto> toFpDtos(List<IFingerprint> fingerprints, EncodingType encodingType) {
        List<FingerprintDto> dtos = new ArrayList<>();
        if (fingerprints != null) {
            for (IFingerprint fingerprint : fingerprints) {
                dtos.add(toDto(fingerprint, encodingType));
            }
        }

        return dtos;
    }

    private static FingerprintDto toDto(IFingerprint fingerprint, EncodingType encodingType) {
        IImage image = fingerprint.createImage(encodingType);
        return new FingerprintDto(
                fingerprint.getFingerType(),
                fingerprint.getDpi(),
                toDto(fingerprint.getQualityScore()),
                toFpLocationDtos(fingerprint.getContainedFingerLocations()),
                toDto(fingerprint.getMeta()),
                fingerprint.getCondition(),
                toDto(image));
    }

    private static FPQualityScoreDto toDto(IFPQualityScore fpQualityScore) {
        if (fpQualityScore == null)
            return null;

        return new FPQualityScoreDto(
                fpQualityScore.getType(),
                fpQualityScore.getQuality(),
                fpQualityScore.getScoreMin(),
                fpQualityScore.getScoreMax(),
                fpQualityScore.getIsHigherScoreBetter());
    }

    public static BiometricMetadataDto toDto(IBiometricMetadata meta) {
        if (meta == null)
            return null;

        return new BiometricMetadataDto(meta.getNotes());
    }

    public static List<FingerprintLocationDto> toFpLocationDtos(List<IFingerprintLocation> fpLocations) {
        if (fpLocations == null)
            return null;

        List<FingerprintLocationDto> dtos = new ArrayList<>();
        for (IFingerprintLocation next : fpLocations) {
            dtos.add(new FingerprintLocationDto(
                    next.getFingerType(),
                    next.getL(),
                    next.getT(),
                    next.getR(),
                    next.getB(),
                    next.getW(),
                    next.getH(),
                    toDto(next.getQualityScore())
            ));
        }

        return dtos;
    }

    private static ImageDto toDto(IImage image) {
        if (image == null)
            return null;

        return new ImageDto(
                image.getWidth(),
                image.getHeight(),
                image.getEncodingType(),
                SerializationHelper.BytesToBase64String(image.getBytes()));
    }

    private static ICaptureIdentity fromDto(CaptureIdentityDto captureIdentityDto) {
        return new CaptureIdentity(captureIdentityDto.id, fromDtos(captureIdentityDto.capturedModalities));
    }

    private static List<ICapturedModality> fromDtos(List<CapturedModalityDto> dtos) {
        if (dtos == null)
            return null;

        List<ICapturedModality> capturedModalities = new ArrayList<>();
        for (CapturedModalityDto dto : dtos) {
            capturedModalities.add(fromDto(dto));
        }

        return capturedModalities;
    }

    private static ICapturedModality fromDto(CapturedModalityDto dto) {
        if (dto == null)
            return null;

        return new CapturedModality(dto.id, dto.captureRequestType);
    }

    private static JSONObject toJSONObject(Object object) throws JSONException {
        return new JSONObject(createDefaultGson().toJson(object));
    }

    private static WritableMap convertJsonToMap(JSONObject jsonObject) throws JSONException {
        WritableMap map = new WritableNativeMap();

        Iterator<String> iterator = jsonObject.keys();
        while (iterator.hasNext()) {
            String key = iterator.next();
            Object value = jsonObject.get(key);
            if (value instanceof JSONObject) {
                map.putMap(key, convertJsonToMap((JSONObject) value));
            } else if (value instanceof JSONArray) {
                map.putArray(key, convertJsonToArray((JSONArray) value));
            } else if (value instanceof  Boolean) {
                map.putBoolean(key, (Boolean) value);
            } else if (value instanceof  Integer) {
                map.putInt(key, (Integer) value);
            } else if (value instanceof  Double) {
                map.putDouble(key, (Double) value);
            } else if (value instanceof String)  {
                map.putString(key, (String) value);
            } else {
                map.putString(key, value.toString());
            }
        }
        return map;
    }

    private static WritableArray convertJsonToArray(JSONArray jsonArray) throws JSONException {
        WritableArray array = new WritableNativeArray();

        for (int i = 0; i < jsonArray.length(); i++) {
            Object value = jsonArray.get(i);
            if (value instanceof JSONObject) {
                array.pushMap(convertJsonToMap((JSONObject) value));
            } else if (value instanceof  JSONArray) {
                array.pushArray(convertJsonToArray((JSONArray) value));
            } else if (value instanceof  Boolean) {
                array.pushBoolean((Boolean) value);
            } else if (value instanceof  Integer) {
                array.pushInt((Integer) value);
            } else if (value instanceof  Double) {
                array.pushDouble((Double) value);
            } else if (value instanceof String)  {
                array.pushString((String) value);
            } else {
                array.pushString(value.toString());
            }
        }
        return array;
    }

    private static JSONObject convertMapToJson(ReadableMap readableMap) throws JSONException {
        JSONObject object = new JSONObject();
        ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
        while (iterator.hasNextKey()) {
            String key = iterator.nextKey();
            switch (readableMap.getType(key)) {
                case Null:
                    object.put(key, JSONObject.NULL);
                    break;
                case Boolean:
                    object.put(key, readableMap.getBoolean(key));
                    break;
                case Number:
                    object.put(key, readableMap.getDouble(key));
                    break;
                case String:
                    object.put(key, readableMap.getString(key));
                    break;
                case Map:
                    object.put(key, convertMapToJson(readableMap.getMap(key)));
                    break;
                case Array:
                    object.put(key, convertArrayToJson(readableMap.getArray(key)));
                    break;
            }
        }
        return object;
    }

    private static JSONArray convertArrayToJson(ReadableArray readableArray) throws JSONException {
        JSONArray array = new JSONArray();
        for (int i = 0; i < readableArray.size(); i++) {
            switch (readableArray.getType(i)) {
                case Null:
                    break;
                case Boolean:
                    array.put(readableArray.getBoolean(i));
                    break;
                case Number:
                    array.put(readableArray.getDouble(i));
                    break;
                case String:
                    array.put(readableArray.getString(i));
                    break;
                case Map:
                    array.put(convertMapToJson(readableArray.getMap(i)));
                    break;
                case Array:
                    array.put(convertArrayToJson(readableArray.getArray(i)));
                    break;
            }
        }
        return array;
    }

    private static ICaptureEngineFaceConfig deserializeFaceConfig(ReadableMap readableMap) {
        ICaptureEngineFaceConfigBuilder builder = SlapshotCaptureSDK.getEngine().createNewCaptureEngineFaceConfigBuilder();

        trySetBool("autoCaptureFaceAfterValidation", readableMap, builder::setAutoCaptureFaceAfterValidation);
        trySetInt("minFaceWidthInPixels", readableMap, builder::setMinFaceWidthInPixels);
        trySetFloat("minFaceWidthToMinorImageAxisRatio", readableMap, builder::setMinFaceWidthToMinorImageAxisRatio);
        trySetInt("maxFaceWidthInPixels", readableMap, builder::setMaxFaceWidthInPixels);
        trySetFloat("maxFaceWidthToMinorImageAxisRatio", readableMap, builder::setMaxFaceWidthToMinorImageAxisRatio);
        trySetInt("requiredMillisecondsOfValidFacesBeforeCapture", readableMap, builder::setRequiredMillisecondsOfValidFacesBeforeCapture);
        trySetFloat("faceExportPaddingFactor", readableMap, builder::setFaceExportPaddingFactor);
        trySetFloat("faceExportHeightToWidthFactor", readableMap, builder::setFaceExportHeightToWidthFactor);
        trySetBool("showDebugFaceCaptureOverlays", readableMap, builder::setShowDebugFaceCaptureOverlays);

        return builder.build();
    }

    private static void tryAddQualityMapsToConfig(ICaptureEngineConfigBuilder builder, ReadableMap readableMap) {
        if (readableMap.hasKey("fpInclusiveQualityMapForScoreTypes")) {
            ReadableMap scoreNameToMap = readableMap.getMap("fpInclusiveQualityMapForScoreTypes");
            if (scoreNameToMap != null) {
                ReadableMapKeySetIterator scoreNameToMapIter = scoreNameToMap.keySetIterator();
                while (scoreNameToMapIter.hasNextKey()) {
                    String nextScoreName = scoreNameToMapIter.nextKey();
                    ReadableMap scoreToQualityLevelMap = scoreNameToMap.getMap(nextScoreName);
                    if (scoreToQualityLevelMap != null) {
                        ReadableMapKeySetIterator scoreToQualityLevelIter = scoreToQualityLevelMap.keySetIterator();
                        Map<Integer, QualityLevel> scoreToQualityLevel = new HashMap<>();
                        while (scoreToQualityLevelIter.hasNextKey()) {
                            String nextScoreStr = scoreToQualityLevelIter.nextKey();
                            String nextQualityLevelStr = scoreToQualityLevelMap.getString(nextScoreStr);
                            if (nextQualityLevelStr != null) {
                                try {
                                    int nextScore = Integer.parseInt(nextScoreStr);
                                    QualityLevel nextQualityLevel = QualityLevel.valueOf(nextQualityLevelStr);
                                    scoreToQualityLevel.put(nextScore, nextQualityLevel);
                                } catch (Exception ignore) {
                                }
                            }
                        }
                        builder.addFpInclusiveQualityMapForScoreType(nextScoreName, scoreToQualityLevel);
                    }
                }
            }
        }
    }

    private static void trySetMissingFingerMap(ReadableMap captureRequestMap, ICaptureRequestBuilder captureRequestBuilder) {
        if (captureRequestMap.hasKey("missingFingerMapping")) {
            ReadableMap missingFingerReadableMap = captureRequestMap.getMap("missingFingerMapping");
            if (missingFingerReadableMap != null) {
                Map<FingerType, FpCondition> missingFingerMap = new HashMap<>();
                ReadableMapKeySetIterator missingFingerMapIter = missingFingerReadableMap.keySetIterator();
                while (missingFingerMapIter.hasNextKey()) {
                    String missingFingerTypeStr = missingFingerMapIter.nextKey();
                    missingFingerMap.put(FingerType.valueOf(missingFingerTypeStr),
                            FpCondition.valueOf(missingFingerReadableMap.getString(missingFingerTypeStr)));
                }
                captureRequestBuilder.setMissingFingerMapping(missingFingerMap);
            }
        }
    }

    private static void trySetInt(String key, ReadableMap readableMap, Consumer<Integer> setter) {
        if (readableMap.hasKey(key)) {
            setter.accept(readableMap.getInt(key));
        }
    }

    private static void trySetFloat(String key, ReadableMap readableMap, Consumer<Float> setter) {
        if (readableMap.hasKey(key)) {
            setter.accept((float)readableMap.getDouble(key));
        }
    }

    private static void trySetBool(String key, ReadableMap readableMap, Consumer<Boolean> setter) {
        if (readableMap.hasKey(key)) {
            setter.accept(readableMap.getBoolean(key));
        }
    }

    private static <T extends Enum<T>> void trySetEnum(String key, ReadableMap readableMap, Class<T> enumType, Consumer<T> setter) {
        if (readableMap.hasKey(key)) {
            String val = readableMap.getString(key);
            if (val != null)
                setter.accept(Enum.valueOf(enumType, val));
        }
    }

    private static void trySetClass(String key, ReadableMap readableMap, Consumer<Class<?>> setter) {
        if (readableMap.hasKey(key)) {
            String className = readableMap.getString(key);
            if (className != null) {
                try {
                    Class<?> clazz = Class.forName(className);
                    setter.accept(clazz);
                } catch (ClassNotFoundException e) {
                    System.err.println("Class not found: " + className);
                    e.printStackTrace();
                }
            }
        }
    }

    private static Gson createDefaultGson() {
        GsonBuilder builder = new GsonBuilder();
        return builder.create();
    }
}
