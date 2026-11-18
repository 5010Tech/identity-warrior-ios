import Foundation
import React

class SlapshotEnginePromiseWrapper {
    var promiseResolve: RCTPromiseResolveBlock?
    var promiseReject: RCTPromiseRejectBlock?

    @discardableResult
    func set(promiseResolve: @escaping RCTPromiseResolveBlock, promiseReject: @escaping RCTPromiseRejectBlock) -> Bool {
        self.promiseReject = promiseReject
        self.promiseResolve = promiseResolve

        return true
    }
    
    func resolve(result: Any?) {
        guard let promiseResolve = promiseResolve else {
            return
        }
        
        var res: Any?
        if let resultAsDict = result as? [String:Any] {
            res = resultAsDict as Any?
        }
        else if let resultAsArray = result as? [Any] {
            var array = [[String:Any]]()
            for next in resultAsArray {
                if let nextCodable = next as? Codable {
                    if let nextCodableAsDict = DataSerializer.Serialize(item: nextCodable) {
                        array.append(nextCodableAsDict)
                    }
                }
            }
            res = array
        }
        else if let resultAsCodeable = result as? Codable {
            res = DataSerializer.Serialize(item: resultAsCodeable) as Any?
        }
        else {
            res = [:]
        }

        promiseResolve(res)

        self.clear()
    }

    func resolve(result: String) {
        guard let promiseResolve = promiseResolve else {
            return
        }
        
        promiseResolve(result)

        self.clear()
    }

    func resolve(result: Bool) {
        guard let promiseResolve = promiseResolve else {
            return
        }

        promiseResolve(result)

        self.clear()
    }
    
    func reject(error: SlapshotCaptureError) {
        guard let promiseReject = promiseReject else {
            return
        }
        
        let e = NSError(domain: "slapshotError", code: 0, userInfo: nil)
        let json = SlapshotSdk.toJsonString(data: DataSerializer.Serialize(item: error)!)
        
        promiseReject(error.error, json, e)

        self.clear()
    }

    func reject(error: String?) {

        let captureError = SlapshotCaptureError(error: error)
        self.reject(error: captureError)
    }

    func clear() {
        self.promiseResolve = nil
        self.promiseReject = nil
    }
}
