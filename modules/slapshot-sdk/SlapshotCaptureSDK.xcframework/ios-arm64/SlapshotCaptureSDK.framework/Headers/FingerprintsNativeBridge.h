#import <UIKit/UIKit.h>
@class DetectCircleResponse;
@class ExtractWaveletRidgeDetailResponse;
@class QualityMapScore;

@interface FingerprintsNativeBridge : NSObject

+ (instancetype)sharedInstance;

- (DetectCircleResponse *) detectCircleFromImage:(UIImage *)image
                                        srcWidth:(int)srcWidth
                                       srcHeight:(int)srcHeight
                                 targetRadiusMin:(int)targetRadiusMin
                                 targetRadiusMax:(int)targetRadiusMax
                                 scaleDownFactor:(double)scaleDownFactor
                                        debugTag:(NSString *)debugTag
                                         isDebug:(bool)isDebug;

- (NSArray *) fpDetectReducedFromImage:(UIImage *)image
                       scaleDownFactor:(float)scaleDownFactor
                                   dpi:(float)dpi
                           captureType:(int)captureType
                          isUpsideDown:(bool)isUpsideDown
                     enforceHandedness:(bool)enforceHandedness
                        missingFingers:(NSArray *)missingFingers;

- (QualityMapScore *) calculateQualityScore:(UIImage *)ridgeImage
                        qualityMap:(UIImage *)qualityMap
                        ridgeWidthPrediction:(UIImage *)ridgeWidthPrediction
                                        dpi:(int)dpi;

- (ExtractWaveletRidgeDetailResponse *) extractWaveletRidgeDetailFromImage:(UIImage *)image
                                                            bgRemovedImage:(UIImage *)bgRemovedImage
                                                           scaleDownFactor:(float)scaleDownFactor
                                                                       dpi:(float)dpi
                                                               captureType:(int)captureType
                                                              isUpsideDown:(bool)isUpsideDown
                                                                         l:(int)l
                                                                         t:(int)t
                                                                         r:(int)r
                                                                         b:(int)b
                                                                isInverted:(bool)isInverted
                                                                isMirrored:(bool)isMirrored
                                                               isCancelled:(bool (^)())isCancelled;

/**
 Extracts ridge detail from a single finger that has already been cropped and masked.

 This is the per-finger counterpart to `extractWaveletRidgeDetailFromImage:…l:t:r:b:`. That
 one takes the whole slap plus the fingertip's bounds and crops internally, which means the
 mask it receives has to be slap-shaped — there is nowhere to put a per-finger mask. This one
 takes the finger's own grayscale and the finger's own foreground mask, so a model that
 segments one finger at a time has somewhere to send its output.

 `srcW`/`srcH` describe the *original* image the finger was cropped from. They are not
 geometry: nothing here maps back into slap space. They are used only to pick a stand-in dpi
 when the capture is uncalibrated and no finger width is known.

 Mirrors `extractWaveletRidgeDetailFromFtip` in the Android SDK's native-lib.cpp, which is
 what `slapshot-native` builds and what Android's `WaveletRidgeExtractor` binds to.

 @param fingerImage the finger's grayscale image, already cropped to the fingertip
 @param foregroundMask the finger's foreground mask, the same size as `fingerImage`
 @param knownFingerWidth the oriented box's minor axis, or 0 when unknown
 @param knownFingerType the `FingerType` raw value, or 0 for unknown
 */
- (ExtractWaveletRidgeDetailResponse *) extractRidgeDetailFromFingerImage:(UIImage *)fingerImage
                                                           foregroundMask:(UIImage *)foregroundMask
                                                                      dpi:(float)dpi
                                                         knownFingerWidth:(float)knownFingerWidth
                                                          knownFingerType:(int)knownFingerType
                                                               isInverted:(bool)isInverted
                                                               isMirrored:(bool)isMirrored
                                                                     srcW:(int)srcW
                                                                     srcH:(int)srcH
                                                              isCancelled:(bool (^)())isCancelled;

- (UIImage *) generateDynamicFingerGuideFromImage:(UIImage *)image
                                  scaleDownFactor:(float)scaleDownFactor
                                              dpi:(float)dpi
                                      captureType:(int)captureType
                                     isUpsideDown:(bool)isUpsideDown;

- (float) getFpScoreFromImage:(UIImage *)image
                          dpi:(float)dpi
                     debugTag:(NSString *)debugTag;

- (double) getSharpnessValueFromImage:(UIImage *)image;

- (UIImage *) removeBackgroundFromImage:(UIImage *)image
                        scaleDownFactor:(float)scaleDownFactor
                                    dpi:(float)dpi
                            captureType:(int)captureType
                           isUpsideDown:(bool)isUpsideDown;

- (UIImage *) removeBackgroundFromImage:(UIImage *)image
                        scaleDownFactor:(float)scaleDownFactor
                                    dpi:(float)dpi
                            captureType:(int)captureType
                           isUpsideDown:(bool)isUpsideDown
                                   roiL:(int)roiL
                                   roiT:(int)roiT
                                   roiR:(int)roiR
                                   roiB:(int)roiB;

@end
