
import Foundation

// let dictionary: [String: Any] = ["name": "John Allen", "age": 32, "company": "Google Inc."]
// guard let jsonData = dictionary.jsonData else {
//      print("Something is wrong while converting dictionary to JSON data.")
//      return
// }
// guard let jsonString = dictionary.toJSONString() else {
//      print("Something is wrong while converting JSON data to JSON string.")
//      return
// }

public extension Dictionary {
       
   var jsonData: Data? {
       return try? JSONSerialization.data(withJSONObject: self, options: [.prettyPrinted])
   }
       
   func toJSONString() -> String? {
       do {
           let jsonData = jsonData
           let decoded = String(data: jsonData!, encoding: .utf8)
              return decoded ?? ""
       } catch _ {
           return "{}}"
       }
   }
}
