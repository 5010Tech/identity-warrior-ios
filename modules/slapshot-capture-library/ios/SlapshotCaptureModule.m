#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SlapshotCaptureModule, RCTEventEmitter);

RCT_EXTERN_METHOD(configure:(NSDictionary *)dictionary)

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

RCT_EXTERN_METHOD(supportedEvents)

RCT_EXTERN_METHOD(canRestore:(RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(configure: (NSDictionary)dictionary)

RCT_EXTERN_METHOD(init: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getVersion: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(backPressed: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isLicensed: (RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setLicenseEntitlement:(NSString *)entitlementId
                  setLicenseWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getLicensingHardwareId:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(installLicense:(NSString *)licenseContent
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
                  
RCT_EXTERN_METHOD(calibrate:(nonnull NSNumber*)viewId onError:(RCTResponseSenderBlock)onError onSuccess:(RCTResponseSenderBlock)onSuccess)

RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(isCalibrated)

RCT_EXTERN_METHOD(resetCalibration: (RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(exportCalibration: (RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addModelBasedCalibration:(NSString)modelBasedCalibrationContent resolve:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(validateCalibration:(nonnull NSNumber*)viewId onError:(RCTResponseSenderBlock)onError onSuccess:(RCTResponseSenderBlock)onSuccess)

RCT_EXTERN_METHOD(captureBiometrics:(NSDictionary)input onError:(RCTResponseSenderBlock)onError onSuccess:(RCTResponseSenderBlock)onSuccess)

RCT_EXTERN_METHOD(runReviewCapturedModality:(NSDictionary)input onError:(RCTResponseSenderBlock)onError onSuccess:(RCTResponseSenderBlock)onSuccess)

RCT_EXTERN_METHOD(exportCapturedIdentity:(NSDictionary)input onError:(RCTResponseSenderBlock)onError onSuccess:(RCTResponseSenderBlock)onSuccess)

RCT_EXTERN_METHOD(getAllCaptureIdentities:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCaptureIdentity:(NSString)identifier resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteCaptureIdentity:(NSDictionary)dictionary resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteAllCaptureIdentities:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resetDirectionPrompts:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

@end
