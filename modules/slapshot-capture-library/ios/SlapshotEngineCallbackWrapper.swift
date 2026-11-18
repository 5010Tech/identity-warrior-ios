import Foundation
import React

class SlapshotEngineCallbackWrapper {
    var callbackReject: RCTResponseSenderBlock?
    var callbackResolve: RCTResponseSenderBlock?
    
    @discardableResult
    func set(callbackResolve: @escaping RCTResponseSenderBlock, callbackReject: @escaping RCTResponseSenderBlock) -> Bool {
        self.callbackReject = callbackReject
        self.callbackResolve = callbackResolve

        return true
    }
    
    func resolve() {
        guard let callbackResolve = callbackResolve else {
            return
        }
        
        callbackResolve([])
        self.clear();
    }
    
    func resolve(result: Codable) {
        guard let callbackResolve = callbackResolve else {
            return
        }

        let res = DataSerializer.Serialize(item: result)
        callbackResolve([res as Any])

        self.clear()
    }
        
    func reject(error: String?) {
        let e = SlapshotCaptureError(error: error)

        self.reject(error: e)
    }
    
    func reject(error: SlapshotCaptureError) {
        guard let callbackReject = callbackReject else {
            return
        }

        let callbackError = DataSerializer.Serialize(item: error)
        callbackReject([callbackError as Any])
        
        self.clear()
    }
    
    func clear() {
        self.callbackResolve = nil
        self.callbackReject = nil
    }

}
