import Foundation
import SwiftUI

@objc(SlapshotCaptureView)
class SlapshotCaptureViewManager : RCTViewManager {
    
    override func view() -> UIView! {
        return SwiftUIWrapper(hostedView: SlapshotCaptureView()).view
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    
    // NOTE: demonstrate attaching a method onto the view
    @objc
    func navigateTo(_ destination: NSString) -> Void {
        print("got it")
    }
}
