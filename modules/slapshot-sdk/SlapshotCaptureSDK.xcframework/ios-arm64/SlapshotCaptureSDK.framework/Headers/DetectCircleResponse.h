#import <UIKit/UIKit.h>
@class DetectedCircle;

@interface DetectCircleResponse : NSObject

@property (nonatomic, strong) DetectedCircle *detectedCircle;
@property (nonatomic, strong) NSDictionary<NSString *, UIImage *> *debugImages;

- (instancetype)initWithDetectedCircle:(DetectedCircle *)detectedCircle
                           debugImages:(NSDictionary<NSString *, UIImage *> *)debugImages;

@end
