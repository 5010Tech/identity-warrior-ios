import Foundation
import SwiftUI

class SlapshotCaptureViewConfiguration {
    static let shared: SlapshotCaptureViewConfiguration = {
      let instance = SlapshotCaptureViewConfiguration()
      
      // Note: further setup, when necessary
      return instance;
    }();
    
    public var view: UIView?
    
    public var viewModel: SlapshotEngine?
        
    init() {
    }
}
