//
//  IdentiFI.m
//  IdentiFI
//
//  Copyright © 2015 - 2023 S.I.C. Biometrics Inc. All rights reserved.
//
//  Update History
//  --------------
//  2024-01-24  Version:1.5.0.1
//              Updated IdentiFI-45i / IdentiFI-50i battery reading for unit with FW version 2.9.4 and above.
//
//  2023-12-20  Version:1.5.0.0
//              Add startCaptureIris for IdentiFI-45I/IdentiFI-50I support.
//              onCaptureError renamed onFpCaptureStatus
//              Add onIrisCaptureStatus
//              Changed  setLEDControlForPowerLED: to add iris LED,  setLEDControlForPowerLED: FpLED: ComLED: IrisLED: mSecOn: mSecOff:
//              Add setPowerOffMode:(int) SecondsToPowerOff; and  onSetPowerOffMode:(int) SecondsToPowerOff;
//              Add getPowerOffMode:(int) SecondsToPowerOff; and  onGetPowerOffMode:(int) SecondsToPowerOff;
//              Deprecated getReaderSuspendMode / onGetReaderSuspendMode.
//              Deprecated setReaderSuspendMode / onSetReaderSuspendMode.
//
//  2022-01-31  Version:1.4.0.0
//              Change the way the IdentiFI can save the fingerprint templates into the circulare buffer.
//              To provide more flexibility, the following methods/callback now have a savedAtIndex parameter:
//              - startCaptureOneFinger:(int) savedAtIndex;
//              - startCaptureTwoFinger:(int) savedAtIndex;
//              - startCaptureFourFinger:(int) savedAtIndex;
//              - startCaptureRollFinger:(int) savedAtIndex;
//              - clearSavedFpImages:(int) savedAtIndex;
//              - onSavedFpImagesCleared:(int) savedAtIndex;
//
//              Note: IdentiFI firmware version 2.5.0 and up needed.
//
//  2021-06-08  Version:1.3.2.0
//              Fixed getFirmwareVersion,getModelNumber,getDeviceSerialNumber callback processing.
//
//  2020-12-20  Version:1.3.1.0
//              Changed connect and onConnectionTimeOut timing.
//
//  2020-10-05  Version:1.3.0.0
//              Added - (void) startFirmwareUpdate:(NSData *) newFirmware
//              Added - (void) onFirmwareTransferCompleted:(int) transferResult
//              Added croppedImage:(BOOL) croppedImage parameter to existing getWSQEncodedFpImageFromImageSavedAt:(int) savedAtIndex
//              to get fingerprint size WSQ encoded image.
//
//  2020-07-10  Version:1.2.2.0
//              Fix onGetWSQEncodedFpImage callback issue.
//
//  2020-06-02  Version:1.2.1.0
//              Added support for IdentiFI-60
//              Added - (void) setReaderSuspendMode: onSetReaderSuspendMode:
//              Added - (void) getReaderSuspendMode: onGetReaderSuspendMode
//              Added - (void) setLEDControlForPowerLED: FpLED: ComLED: mSecOn: mSecOff:
//              Added - (void) setLEDBrightness: onSetLEDBrightness:
//              Added - (void) getLEDBrightness onGetLEDBrightness:
//              Added securityLevel parameter to isFingerDuplicated
//  2020-04-14  Version:1.2.0.0
//              Added support for IdentiFI-30.
//              Implemented WSQ compression ratio change based on IdentiFI model as follow:
//              Compression ratio:
//                      1:5 (bitRate = 2.25) for IdentiFI-30
//                      1:15 (bitRate = 0.75) for IdentiFI-45,-50.
//              Added setMinimumNFIQScore/onSetMinimumNFIQScore.
//              Added onCaptureError for rolling smear detection and minimum NFIQ score not met.
//              Added isFingerDuplicated / onIsFingerDuplicated.
//
//  2020-02-17  Version:1.1.7.3
//              Implemented latest IdentiFI-50
//              Renamed IdentiFI-45 reference to IdentiFI (Fit for IdentiFI-45 and IdentiFI-50)
//              Added Xcode Simulator x86_64 architecture build and combined into Fat libIdentiFI.a library.
//  2019-01-18  Version:1.1.7
//              Implemented - (void) onGetSegmentedFpImage_RAW:(NSData *) rawFpImageData fromImageSavedAt:(int)savedAtIndex;
//  2018-12-11  Version:1.1.6
//              Fix Connect / onConnection that would be raised on a second connect call while the connection is not yet completed.
//              Change back the onConnectionTimeOut from 90 to 10 sec.
//  2018-11-15  Version:1.1.5
//              All preview image size are now 1/4th (150 000 bytes/frame) of the original full size(600 000 bytes/frame).
//  2018-08-29  Version:1.1.4
//              Increaase onConnectionTimeOut from 10 to 90 sec.
//  2018-08-29  Version:1.1.3
//              Change the way onConnectionTimeOut is handle and increased the delay from 6 to 10/15/25 sec.
//              Add an new delegate - (void) onConnectionError:(NSString *) errorDescription;
//  2018-08-05  Version:1.1.2
//              Fix Cancel Capture issue.
//  2018-07-10  Version:1.1.1
//              Replaced getBatteryLevel/ onGetBatteryLevel: by getBatteryPercentage/onGetBatteryPercentage.
//
//  2018-07-01  Version:1.1.0
//              All fingerprint capture process have been redesign to reduce time per capture.
//              WSQ and NFIQ score are no more generated at the end of each capture, and no more
//              part of the delegate LastFrame callback.
//              Each fingerprint capture is now saved into the IdentiFI-45 RAM (volatile) memory.
//              Powering off the IdentiFI-45 will loose all saved fp image capture.
//              Up to 10 fingerprint images can be kept into the IdentiFI-45 memory.
//              At the end of a fingerprint capture, the delegate callback will receive a savedAtIndex
//              value, between 0 to 9, indication at which memory slot the fp image capture is saved.
//              Each WSQ encoded image and NFIQ score can the be retreived at a later time using
//              a saveAtIndex value in the same range between 0 to 9.
//              Once all the 10 memory slot have been used (0 through 9), any additional fp
//              capture will be saved, and overwrite previously save fp image at index 9.
//
//              Clearing of all saved memory space is done through calling -(void) clearSavedFpImages.
//              Once the memory space have been erased, the onSavedFpImagesCleared delegate callback
//              is called.
//
//              - (void) getWSQEncodedFpImageFromImageSavedAt:(int) savedAtIndex is now used
//              to retreived the WSQ encoded image of a saved fp image capture.
//
//              - (void) getNfiqScoreFromImageSavedAt:(int) savedAtIndex is now used
//              to retreived the NFIQ score of a saved fp image capture.
//
//              An -(void) onConnectionTimeOut delegate callback have between added. Timeout is 6 sec.
//
//              A Streaming callback have been added for rolled fingerprint preview.
//              - (void) onStreamingRolledFp: rollingState: verticalLineX: callback now provide
//              capture state and vertical line position feedback for the user.
//
//              Two LastFrame callback have been added for rolled fingerprint final capture.
//              The fpImageSavedAt: parameters return the index value of the save fp image.
//              - (void) onLastFrameRolledFp: fpImageSavedAt:
//              - (void) onLastFrameRolledFp_RAW: fpImageSavedAt:
//
//              CancelCapture processing have been fixed and now returns with
//              - (void) onCancelCapture delegate callback.
//
//              Required IdentiFI-45 firmware version 1.2.1 and up.
//
//  2017-02-28  Version:1.0.2
//              Added support for raw FP image and NFIQ score with new delegate:
//              - (void) onLastFrame:(NSData *)  rawFpImageData withNFIQ: (int) nfiqScore
//              Required IdentiFI-45 firmware version 1.0.0 and up.
//  2017-01-17  Version:1.0.1
//              Added getWSQEncodedFingerprintImage / onGetWSQEncodedFingerprintImage to retrieved WSQ encoded fingerprint image.
//              Added getFpPowerStatus / onGetFpPowerStatus, setFpPowerOn / onGetFpPowerOn,
//              setFpPowerOff / onSetFpPowerOff to manage fingerprint sensor power and extend battery charge.
//              Requires IdentiFI-45 firmware version 0.8.0 and up.
//  2016-12-04  Version:1.0.0
//              Initial Release

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface IdentiFI : NSObject
{
    id delegate;
}

//Library setup
- (void) setDelegate:(id)newDelegate;
- (id)init;

//Communication link
- (void) connect;
- (void) disconnect;

//Finger capture
- (void) cancelFpCapture;
- (void) startCaptureOneFinger:(int) savedAtIndex;
- (void) startCaptureTwoFinger:(int) savedAtIndex;
- (void) startCaptureFourFinger:(int) savedAtIndex;
- (void) startCaptureRollFinger:(int) savedAtIndex;

//Iris capture
- (void) cancelIrisCapture;
- (void) startCaptureIris;

//IdentiFI's settings
- (void) setLEDBrightness:(int) LEDBrightness;
- (void) getLEDBrightness;
- (void) setMinimumNFIQScore:(int) minimumNFIQScore;
- (void) getPowerOffMode;
- (void) setPowerOffMode:(int) secondsToPowerOff;

//Saved fingerprint images. (Saved into volatile memory! Fingerprint images lost on poweroff.)
- (void) clearSavedFpImages:(int) savedAtIndex;
- (void) getNfiqScoreFromImageSavedAt:(int) savedAtIndex;
- (void) getSegmentedFpImageSavedAt:(int) savedAtIndex;
- (void) getWSQEncodedFpImageFromImageSavedAt:(int) savedAtIndex croppedImage:(BOOL) croppedImage;
- (void) isFingerDuplicated:(int) savedAtIndex securityLevel:(int) securityLevel;

//Power Management
- (void) getFpPowerStatus;
- (void) setFpPowerOn;
- (void) setFpPowerOff;

- (void) getIrisPowerStatus;
- (void) setIrisPowerOn;
- (void) setIrisPowerOff;

//Device information
- (void) getBatteryPercentage;
- (void) getDeviceSerialNumber;
- (void) getFirmwareVersion;
- (NSString *)getLibraryVersion;
- (void) getModelNumber;
- (void) getReaderDescription;

//Keypad's LEDs control
- (void) setLEDControlForPowerLED:(int) power FpLED:(int) fp ComLED:(int) com IrisLED:(int) iris mSecOn:(int) mOn mSecOff:(int) mOff;

//Firmware update
- (void) startFirmwareUpdate:(NSData *) newFirmware;

@end

@protocol IdentiFI_Delegate <NSObject>

//Communication Link
- (void) onConnection;
- (void) onConnectionError:(NSString *) errorDescription;
- (void) onConnectionTimeOut;
- (void) onDisconnection;

//Finger capture
- (void) onCancelFpCapture;
- (void) onFpCaptureStatus:(int) fpCaptureStatus;
- (void) onStreaming:             (UIImage *) fpImage;
- (void) onStreamingRolledFp:     (UIImage *) fpImage          rollingState:   (int) currentState   verticalLineX:(int) currentXPosition;
- (void) onLastFrame:             (UIImage *) fpImage          fpImageSavedAt: (int) savedAtIndex;
- (void) onLastFrame_RAW:         (NSData *)  rawFpImageData   fpImageSavedAt: (int) savedAtIndex;
- (void) onLastFrameRolledFp:     (UIImage *) fpImage          fpImageSavedAt: (int) savedAtIndex;
- (void) onLastFrameRolledFp_RAW: (NSData *)  rawFpImageData   fpImageSavedAt: (int) savedAtIndex;

//Iris capture
- (void) onCancelIrisCapture;
- (void) onIrisCaptureStatus:(int) irisCaptureStatus;
- (void) onStreamingLeftIris:(UIImage *) leftIrisImage RightIris:(UIImage *) rightIrisImage;
- (void) onLastFrameLeftIris:(UIImage *) leftIrisImage RightIris:(UIImage *) rightIrisImage  LeftIrisTotalScore:(int) leftTotalScore LeftIrisUsableArea:(int) leftUsabeArea RightIrisTotalScore:(int) rightTotalScore RightIrisUsableArea:(int) rightUsabeArea;

//IdentiFI's settings
- (void) onGetLEDBrightness:(int) ledBrightness;
- (void) onSetLEDBrightness:(int) ledBrightness;
- (void) onSetMinimumNFIQScore:(int) minimumNFIQScore;


//Saved fingerprint images.
- (void) onGetNfiqScore:(int) nfiqScore fromImageSavedAt: (int) savedAtIndex;
- (void) onGetSegmentedFpImage_RAW:(NSData *) rawFpImageData fromImageSavedAt:(int)savedAtIndex;
- (void) onGetWSQEncodedFpImage:(NSData *) wsqEncodedFpImageData fromImageSavedAt:(int) savedAtIndex;
- (void) onIsFingerDuplicated:(int) isFingerDuplicated;
- (void) onSavedFpImagesCleared:(int) savedAtIndex;

//Power management
- (void) onGetPowerOffMode:(int) secondsToPowerOff;
- (void) onSetPowerOffMode:(int) secondsToPowerOff;

- (void) onGetFpPowerStatus:(Boolean) irisPowerStatus;
- (void) onSetFpPowerOn:(Boolean) irisPowerStatus;
- (void) onSetFpPowerOff;

- (void) onGetIrisPowerStatus:(Boolean) irisPowerStatus;
- (void) onSetIrisPowerOn:(Boolean) irisPowerStatus;
- (void) onSetIrisPowerOff;

//Device information
- (void) onGetBatteryPercentage:(int) percentLevel;
- (void) onGetDeviceSerialNumber:(NSString*) serialNumber;
- (void) onGetFirmwareVersion:(NSString *) version;
- (void) onGetModelNumber:(NSString *) model;
- (void) onGetReaderDescription:(NSString *) deviceDescription;

//Keypad's LEDs control
- (void) onSetLEDControlForPowerLED:(int) power FpLED:(int) fp ComLED:(int) com IrisLED:(int) iris mSecOn:(int) mOn mSecOff:(int) mOff;

//Firmware update
- (void) onFirmwareTransferCompleted:(long) transferResult;
@end
