import Foundation

protocol SlapshotCaptureEventEmitter {
    func sendProgress(value: Int) -> Void
}
