import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import BackState from "./BackState";
import BiometricPayload from "./BiometricPayload";
import CaptureBiometricsRequest from "./CaptureBiometricsRequest";
import CaptureEngineConfig from "./CaptureEngineConfig";
import CaptureRequestSequence from "./CaptureRequestSequence";
import ExportCaptureRequest from "./ExportCaptureRequest";
import SlapshotCaptureError from "./SlapshotCaptureError";
import SlapshotCaptureIdentity from "./SlapshotCaptureIdentity";
import SlapshotCaptureModality from "./SlapshotCaptureModality";
import ReviewRequest from "./ReviewRequest";
import ReviewBiometricsRequest from "./ReviewBiometricsRequest";
import pkg from "./../package.json";

const { SlapshotCaptureModule } = NativeModules;
const { EXPORT_PROGRESS_EVENT_NAME } = SlapshotCaptureModule.getConstants();

export async function getVersionAsync(): Promise<string> {
  let rnVersion = pkg.version;
  console.log(
    `SlapshotCaptureEngine - getVersion ${rnVersion} (native ${await SlapshotCaptureModule.getVersion()})`,
  );
  return rnVersion;
}

/**
 * configures the Slapshot Capture engine. Should be called at least once before initAsync(), but
 * can be called again to reconfigure the SDK in a different way. Calling configureAsync multiple
 * times with the same state of 'config' is allowed and will be a no-op.
 * @param config the config instance
 */
export async function configureAsync(
  config: CaptureEngineConfig,
): Promise<void> {
  console.log("SlapshotCaptureEngine - configure");
  await SlapshotCaptureModule.configure(config);
}

/**
 * initializes the Slapshot Capture engine. This needs to be called before any biometric capture
 * requests, calibrations or exports
 */
export async function initAsync(): Promise<void> {
  console.log("SlapshotCaptureEngine - init");
  await SlapshotCaptureModule.init();
}

/**
 * returns whether the SDK is expecting to be restored from a capture or calibration routine that was paused due to an Acitivity restart.
 * Because React Native isn't aware of the Activity vs Application lifecycle in Android, this function queries the native engine to see
 * whether the restore is expected do that the React Native host can re-call the expected capture or calibration routine to allow the
 * engine to pick up where it left off with a new supplied viewId and valid callbacks. See sample app and documentation for details.
 * @returns whether the SDK is expecting to be restored from a capture or calibration routine that was paused due to an Acitivity restart
 */
export async function canRestore(): Promise<boolean> {
  console.log("SlapshotCaptureEngine - canRestore");
  return await SlapshotCaptureModule.canRestore();
}

/**
 * returns whether the Slapshot Capture SDK is licensed. If true is returned, then calls to activateLicenseKeyAsync() are not required.
 * @returns whether the Slapshot Capture SDK is licensed
 */
export async function isLicensedAsync(): Promise<boolean> {
  console.log("SlapshotCaptureEngine - isLicensed");
  return await SlapshotCaptureModule.isLicensed();
}

/**
 * Activates the given license key. This requires the device to be connected to the internet for the duration of the call. If successful, then a license has been installed for the device.
 * Calls to SlapshotCaptureEngine.installLicenseAsync(licenseContents) are not required when using this method.
 * This should be called AFTER checking to see if SlapshotCaptureEngine.isLicensedAsync() returns false. After a successful license key
 * has been activated, then this call will not be necessary in subsequent app sessions because SlapshotCaptureEngine.isLicensedAsync() will return true.
 * This method requires a network connection and needs to be called from a BACKGROUND THREAD because it makes a web service call.
 * This should be called AFTER configuration SlapshotCaptureEngine.configureAsync(CaptureEngineConfig) AND initialization SlapshotCaptureEngine.initAsync()
 * and BEFORE use of the SDK capture and export calls.
 * @param licenseKey the license key to activate
 */
export async function activateLicenseKeyAsync(
  licenseKey: string,
): Promise<void> {
  console.log("SlapshotCaptureEngine - activateLicenseKey");

  await SlapshotCaptureModule.activateLicenseKey(licenseKey);
}

/**
 * installs the license provided to you or created from the client's web portal. This endpoint can be used instead
 * of activateLicenseKeyAsync(). This can support the scenario where the end user's device cannot be connected
 * to the internet at any time
 * @param licenseContents the contents of the provided license decoded as a string
 */
export async function installLicenseAsync(
  licenseContents: string,
): Promise<void> {
  console.log("SlapshotCaptureEngine - installLicense");

  await SlapshotCaptureModule.installLicense(licenseContents);
}

/**
 * returns a request for an offline license based on the given licenseKey. This String can be saved as a file which is a license request that can be used to generate a license file via
 * <a href="https://offline.licensespring.com/">...</a>. The externally generated ls_activation.lic file would then be used
 * with SlapshotCaptureEngine.installLicenseAsync(licenseContents).
 * This method is NOT used when licensing via SlapshotCaptureEngine.activateLicenseKeyAsync(licenseKey)
 * @return a request for an offline license. This String should be saved as a file and used in the vendor portal to create an offline license
 */
export async function createOfflineLicenseRequestAsync(): Promise<string> {
  console.log("SlapshotCaptureEngine - createOfflineLicenseRequest");

  return await SlapshotCaptureModule.createOfflineLicenseRequest();
}

/**
 * returns whether the engine is calibrated for contactless finger captures
 * @returns whether the engine is calibrated for contactless finger captures
 */
export function isCalibrated(): boolean {
  console.log("SlapshotCaptureEngine - isCalibrated");

  return SlapshotCaptureModule.isCalibrated();
}

/**
 * resets the calibration on the engine meaning the engine is no longer calibrated. Can be called on an uncalibrated engine
 */
export async function resetCalibrationAsync(): Promise<void> {
  await SlapshotCaptureModule.resetCalibration();
}

/**
 * exports the current calibration as a file to disk. The user will be prompted as to where to export the file.
 * This exported file can be used as an input to addModelBasedCalibrationAsync()
 */
export async function exportCalibrationAsync(): Promise<void> {
  await SlapshotCaptureModule.exportCalibration();
}

/**
 * adds a model based calibration to the set of supported model based calibrations. {- Parameter modelBasedCalibrationContent} should
 * be the string representation of a file that was exporting using SlapshotCaptureEngine#exportCalibrationAsync().
 * When a calibration is run where model-based calibration is supported/requested, if the make and model of the running device matches
 * a calibration that has been loaded using this method, then model-based calibration will be used. If no matching calibration is found,
 * then default calibration will proceed. Model-based calibration reduces the number of calibration captures that are required to calibrate the device.
 *
 * - Parameter modelBasedCalibrationContent the string representation of a file exported using SlapshotCaptureEngine#exportCalibration()
 *
 * - Returns: true if the calibration represented by {- Parameter modelBasedCalibrationContent} matches the make and model of the running device
 *
 * - Throws: ``SlapshotCaptureError``
 */
export async function addModelBasedCalibrationAsync(
  modelBasedCalibrationContent: string,
): Promise<boolean> {
  return await SlapshotCaptureModule.addModelBasedCalibration(
    modelBasedCalibrationContent,
  );
}

/**
 * runs the calibration routine for contactless finger captures. See documentation for further details.
 * @param viewId the id of the view that the calibration routine will be presented
 * @param onError error callback for when the calibration routine fails or is cancelled
 * @param onSuccess success callback when the calibration successfully completes
 */
export function calibrate(
  viewId: number,
  onError: (slapshotCaptureError: SlapshotCaptureError) => void,
  onSuccess: () => void,
) {
  console.log("SlapshotCaptureEngine - calibrate");

  SlapshotCaptureModule.calibrate(
    viewId,
    (slapshotCaptureError: SlapshotCaptureError) => {
      onError(new SlapshotCaptureError(slapshotCaptureError));
    },
    onSuccess,
  );
}

/**
 * runs a calibration validation routine. This can only be run if the device is already calibrated.
 * Once the process successfully completes, the user will be presented with the accuracy of the existing calibration.
 * @param viewId the id of the view that the calibration validation routine will be presented
 * @param onError error callback for when the calibration validation routine fails or is cancelled
 * @param onSuccess success callback when the calibration validation successfully completes
 */
export function validateCalibration(
  viewId: number,
  onError: (slapshotCaptureError: SlapshotCaptureError) => void,
  onSuccess: () => void,
) {
  console.log("SlapshotCaptureEngine - validateCalibration");

  SlapshotCaptureModule.validateCalibration(
    viewId,
    (slapshotCaptureError: SlapshotCaptureError) => {
      onError(new SlapshotCaptureError(slapshotCaptureError));
    },
    onSuccess,
  );
}

/**
 * runs a set of capture routines based on what the host supplies in the captureRequestSequence. See documentation for further details.
 * @param viewId the id of the view that the capture routines will be presented
 * @param captureRequestSequence the sequence of capture requests that will be captured
 * @param onError error callback for when the capture sequence fails or is cancelled
 * @param onSuccess success callback for when the capture sequence completes. Returns the SlapshotCaptureIdentity representing all of the captured
 * biometrics that can be used in calls to exportIdentity
 */
export function captureBiometrics(
  viewId: number,
  captureRequestSequence: CaptureRequestSequence,
  onError: (slapshotCaptureError: SlapshotCaptureError) => void,
  onSuccess: (capturedIdentity: SlapshotCaptureIdentity) => void,
) {
  // we wrap the callbacks because we have to create concrete instances of the payloads coming back
  // from the module or else the callers assumptions that the supplied class is of the given 'type'
  // WILL BE WRONG (i.e. capturedIdentity instanceof SlapshotCaptureIdentity === false)
  SlapshotCaptureModule.captureBiometrics(
    new CaptureBiometricsRequest(captureRequestSequence, viewId),
    (slapshotCaptureError: SlapshotCaptureError) => {
      onError(new SlapshotCaptureError(slapshotCaptureError));
    },
    (capturedIdentityObj: SlapshotCaptureIdentity) => {
      onSuccess(new SlapshotCaptureIdentity(capturedIdentityObj));
    },
  );
}

export function runReviewCapturedModality(
  viewId: number,
  reviewRequest: ReviewRequest,
  onError: (slapshotCaptureError: SlapshotCaptureError) => void,
  onSuccess: (capturedIdentity: SlapshotCaptureIdentity) => void,
) {
  SlapshotCaptureModule.runReviewCapturedModality(
    new ReviewBiometricsRequest(reviewRequest, viewId),
    (slapshotCaptureError: SlapshotCaptureError) => {
      onError(new SlapshotCaptureError(slapshotCaptureError));
    },
    (capturedIdentityObj: SlapshotCaptureIdentity) => {
      onSuccess(new SlapshotCaptureIdentity(capturedIdentityObj));
    },
  );
}

/**
 * exports the given SlapshotCaptureIdentity supplied in the ExportCaptureRequest. This runs in a background process and will return a BiometricPayload
 * representing all of the exported biometrics from the request.
 * @param exportCaptureRequest the export request containing the SlapshotCaptureIdentity to be exported
 * @param onError error callback for when the export fails
 * @param onSuccess success callback when the export completes. Returns a BiometricPayload representing all of the exported biometrics from the request
 */
export function exportIdentity(
  exportCaptureRequest: ExportCaptureRequest,
  onError: (slapshotCaptureError: SlapshotCaptureError) => void,
  onSuccess: (biometricPayload: BiometricPayload) => void,
) {
  const eventEmitter = new NativeEventEmitter(SlapshotCaptureModule);

  const eventListener = eventEmitter.addListener(
    EXPORT_PROGRESS_EVENT_NAME,
    (event) => {
      exportCaptureRequest.progressCallback?.(event.progress);
    },
  );

  const { progressCallback, ...nativeRequest } = exportCaptureRequest as any;

  function onSuccessWrapper(biometricPayload: BiometricPayload) {
    eventListener.remove();
    onSuccess(new BiometricPayload(biometricPayload));
  }

  function onErrorWrapper(slapshotCaptureError: SlapshotCaptureError) {
    eventListener.remove();
    onError(new SlapshotCaptureError(slapshotCaptureError));
  }

  SlapshotCaptureModule.exportCapturedIdentity(
    nativeRequest,
    onErrorWrapper,
    onSuccessWrapper,
  );
}

/**
 * forwards an "back press" event to the Slapshot Capture SDK to be handled. This allows for support of hardware backbuttons within the SDK
 * routines. See sample app for details. Not using this hook will circumvent how the SDK is expected to behave
 * @returns a BackState representing how the event was handled
 */
export async function onBackPressedAsync(): Promise<BackState> {
  console.log("SlapshotCaptureEngine - onBackPressedAsync");

  return await SlapshotCaptureModule.backPressed();
}

/**
 * resets the flags indicating that the user has seen the directions for the different captures. After this is called, the directions
 * for biometric captures will be shown the next time each biometric capture is initiated
 */
export async function resetDirectionPromptsAsync(): Promise<void> {
  console.log("SlapshotCaptureEngine - resetDirectionPrompts");

  return await SlapshotCaptureModule.resetDirectionPrompts();
}

/**
 * gets all of the captured identities currently saved in the engine. The modalities of each identity should NOT be
 * assumed to be populated, although in some environments (like iOS) they might be populated. Use getCaptureIdentityAsync()
 * for full hydration of a particular identity.
 * @return all of the captured identities currently saved in the engine
 * @throws SlapshotException an error occurred
 */
export async function getAllCaptureIdentitiesAsync(): Promise<
  SlapshotCaptureIdentity[]
> {
  console.log("SlapshotCaptureEngine - getAllCaptureIdentities");

  const returnVal = await SlapshotCaptureModule.getAllCaptureIdentities();
  const typeSafeCollection: SlapshotCaptureIdentity[] = [];
  returnVal.forEach(
    (element: {
      id: string;
      capturedModalities: SlapshotCaptureModality[];
    }) => {
      typeSafeCollection.push(new SlapshotCaptureIdentity(element));
    },
  );

  return typeSafeCollection;
}

/**
 * gets the SlapshotCaptureIdentity based on its id. Returns null if it does not exist
 *
 * - Parameter id the requested id
 *
 * - Returns: the SlapshotCaptureIdentity based on its id. Returns null if it does not exist
 */
export async function getCaptureIdentityAsync(
  id: String,
): Promise<SlapshotCaptureIdentity> {
  console.log(`SlapshotCaptureEngine - getCaptureIdentityAsync ${id}`);

  const returnVal = await SlapshotCaptureModule.getCaptureIdentity(id);
  const typeSafeVal = new SlapshotCaptureIdentity(returnVal);
  return typeSafeVal;
}

/**
 * deletes the ``SlapshotCaptureIdentity``. Will NOT error if the identity does not exist
 *
 * - Parameter captureIdentity the CaptureIdentity to be deleted
 */
export async function deleteCaptureIdentityAsync(
  captureIdentity: SlapshotCaptureIdentity,
): Promise<void> {
  console.log(`SlapshotCaptureEngine - deleteCaptureIdentity`);

  await SlapshotCaptureModule.deleteCaptureIdentity(captureIdentity);
}

/**
 * deletes all ``SlapshotCaptureIdentity`` instances (along with all of their associated biometric capture data) saved in the engine
 */
export async function deleteAllCaptureIdentitiesAsync(): Promise<void> {
  console.log(`SlapshotCaptureEngine - deleteAllCaptureIdentities`);

  await SlapshotCaptureModule.deleteAllCaptureIdentities();
}

export default {
  getVersionAsync,
  configureAsync,
  initAsync,
  canRestore,
  isLicensedAsync,
  activateLicenseKeyAsync,
  createOfflineLicenseRequestAsync,
  installLicenseAsync,
  isCalibrated,
  resetCalibrationAsync,
  exportCalibrationAsync,
  addModelBasedCalibrationAsync,
  calibrate,
  validateCalibration,
  captureBiometrics,
  runReviewCapturedModality,
  exportIdentity,
  onBackPressedAsync,
  resetDirectionPromptsAsync,
  getAllCaptureIdentitiesAsync,
  getCaptureIdentityAsync,
  deleteCaptureIdentityAsync,
  deleteAllCaptureIdentitiesAsync,
};
