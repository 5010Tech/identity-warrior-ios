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
