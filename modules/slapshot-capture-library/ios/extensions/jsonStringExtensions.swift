
import Foundation

// let json = "{"movies":[{"id": 100, "name": "Transformers", "desc": "Desc here."},{"id": 101, "name": "Avengers", "desc": "Desc here 2."},{"id": 102, "name": "Interstellar", "desc": "Desc here 3."}]}"
// if let dictionary = json.jsonToDictionary {
//   print("Dictionary format: \(dictionary)")
// }

public extension String {
    
   var jsonToDictionary: [String: Any]? {
      let data = Data(self.utf8)
      do {
         // make sure this JSON is in the format we expect
         if let dictionary = try JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed) as? [String: Any] {
            return dictionary
         }
      } catch let error as NSError {
          print("Failed to load: \(error.localizedDescription)")
      }
      return nil
   }
}
