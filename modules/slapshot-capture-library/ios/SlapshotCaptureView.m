@import Foundation;
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(SlapshotCaptureView, RCTViewManager)

// exported view property to be set in React Native
RCT_EXPORT_VIEW_PROPERTY(textComingFromReact, NSString)

RCT_EXTERN_METHOD(navigateTo: (NSString*)destination)

@end
