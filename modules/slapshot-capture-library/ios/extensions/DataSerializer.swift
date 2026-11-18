import Foundation
import Combine
import SwiftUI

public class DataSerializer {
    public static func Serialize<T: Codable>(item: T) -> [String: Any]? {
        let jsonEncoder = JSONEncoder()
        let jsonData = try! jsonEncoder.encode(item)
        
        let json = String(data: jsonData, encoding: String.Encoding.utf8)
        
        return json?.jsonToDictionary
    }
    
    public static func Deserialize<T: Decodable>(from jsonInput: String) throws -> T {
        let jsonData = Data(jsonInput.utf8)
        
        return try JSONDecoder().decode(T.self, from: jsonData)
    }
}
