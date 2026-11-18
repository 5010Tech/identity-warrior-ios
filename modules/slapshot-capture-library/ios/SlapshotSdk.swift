import Foundation

class SlapshotSdk {
    static var eventEmitter: SlapshotCaptureEventEmitter?
    
    static func toJson(data: String) -> [String: Any] {
        do {
            let dictionary = try JSONSerialization.jsonObject(with: data.data(using: .utf8)!, options: [.mutableContainers])
            as? [String: Any]
            return dictionary ?? [:]
        } catch let error {
            SlapshotLogger.error(error.localizedDescription)
        }
        
        return [:]
    }
    
    static func toJsonString(data: [String: Any]) -> String {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
            let decoded = String(data: jsonData, encoding: .utf8)
            return decoded ?? ""
        } catch _ {
            return "{}"
        }
    }
}
