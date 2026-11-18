import Foundation

class SlapshotLogger {
    public static func write(_ format: String, _ args: any CVarArg...) {
        NSLog(format)
    }
    
    public static func error(_ format: String, _ args: any CVarArg...) {
        NSLog(format)
    }
}
