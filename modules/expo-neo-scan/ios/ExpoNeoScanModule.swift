import ExpoModulesCore
import Foundation
import UIKit

@objcMembers
public class ScanCallbackHandler: NSObject {
    weak var module: ExpoNeoScanModule?
    
    init(module: ExpoNeoScanModule) {
        self.module = module
    }
    
    @objc func ReceiveResponse(_ str: NSString) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            print("WARNING No callback set - Response from SDK: \(str)")
        }
    }
    
    @objc func onGetConfiguration(_ configXml: NSString) {
        DispatchQueue.main.async { [weak self] in
            self?.module?.cancelTimeout()
            self?.module?.handleGetConfiguration(configXml)
        }
    }
    
    @objc func onSetCustomProfile(_ errorStr: NSString) {
        DispatchQueue.main.async { [weak self] in
            self?.module?.cancelTimeout()
            print("onSetCustomProfile: \(errorStr)")
            self?.module?.handleSetCustomProfile(errorStr)
        }
    }
    
    @objc func onGetImageList(_ xmlData: NSData, withError error: NSString) {
        DispatchQueue.main.async { [weak self] in
            self?.module?.cancelTimeout()
            self?.module?.handleGetImageList(xmlData, withError: error)
        }
    }
    
    @objc func onGetImage(_ imageData: NSData, withError error: NSString) {
        DispatchQueue.main.async { [weak self] in
            self?.module?.cancelTimeout()
            self?.module?.handleGetImage(imageData, withError: error)
        }
    }
    @objc func onUpdateTime(_ error: NSString) {
        DispatchQueue.main.async { [weak self] in
            self?.module?.cancelTimeout()
            self?.module?.handleUpdateTime(error)
        }
    }
}

public class ExpoNeoScanModule: Module {
    
    fileprivate var communicator: NeoScanBTCommunication?
    private var callbackHandler: ScanCallbackHandler?
    private var neoScanBridge: NeoScanBridge?
    private var promises: [String: Promise] = [:]
    private var currentImageName: String?
    
    /// Single timer used to cancel the current pending call
    private var currentTimeoutWorkItem: DispatchWorkItem?
    
    required public init(appContext: AppContext) {
        super.init(appContext: appContext)
        EAAccessoryManager.shared().registerForLocalNotifications()
    }
    
    deinit {
        currentTimeoutWorkItem?.cancel()
        if let handler = callbackHandler {
            NotificationCenter.default.removeObserver(handler)
        }
    }
    
    public func definition() -> ModuleDefinition {
        Name("ExpoNeoScan")
        
        AsyncFunction("connectNeoScan") { (promise: Promise) in
            guard self.connectNeoScan(), let handler = callbackHandler else {
                return promise.reject("E_CONNECT", "Failed to connect to device")
            }
            
            self.promises["updateTime"] = promise
            _ = EADSessionController.shared().getReadData()
            self.installTimeout(for: "updateTime", promise: promise)
            self.communicator?.setCallBack(#selector(handler.onUpdateTime(_:)), object: handler)
            self.communicator?.updateTime()
        }
        
        AsyncFunction("disconnectNeoScan") {
            guard let comm = self.communicator, let handler = self.callbackHandler, let bridge = neoScanBridge else {
                return false
            }
            comm.disconnectNeoScan(bridge)
            self.communicator = nil
            self.callbackHandler = nil
            self.neoScanBridge = nil
            return true
        }
        
        AsyncFunction("getDeviceInfo") { () -> [String: String]? in
            guard let accessory = findNeoScanAccessory() else {
                throw NSError(domain: "ExpoNeoScan", code: 0,
                              userInfo: [NSLocalizedDescriptionKey: "No device connected"])
            }
            return [
                "name": accessory.name,
                "manufacturer": accessory.manufacturer,
                "modelNumber": accessory.modelNumber,
                "serialNumber": accessory.serialNumber
            ]
        }
        
        AsyncFunction("getImageList") { (promise: Promise) in
            guard let comm = self.communicator, let handler = self.callbackHandler else {
                return promise.reject("E_NO_DEVICE", "Not connected")
            }
            promises["getImageList"] = promise
            installTimeout(for: "getImageList", promise: promise)
            comm.setCallBack(#selector(handler.onGetImageList(_:withError:)), object: handler)
            comm.getImageList()
        }
        
        AsyncFunction("getImage") { (imageName: String, promise: Promise) in
            guard let comm = self.communicator, let handler = self.callbackHandler else {
                currentImageName = imageName
                return promise.reject("E_NO_DEVICE", "Not connected")
            }
            currentImageName = imageName
            promises["getImage"] = promise
            installTimeout(for: "getImage", promise: promise)
            comm.setCallBack(#selector(handler.onGetImage(_:withError:)), object: handler)
            comm.getImage(imageName)
        }
        
        AsyncFunction("getConfiguration") { (promise: Promise) in
            guard let comm = self.communicator, let handler = self.callbackHandler else {
                return promise.reject("E_NO_DEVICE", "Not connected")
            }
            promises["getConfiguration"] = promise
            installTimeout(for: "getConfiguration", promise: promise)
            comm.setCallBack(#selector(handler.onGetConfiguration(_:)), object: handler)
            comm.getConfiguration()
        }
        
        AsyncFunction("setCustomProfile") { (profile: String, promise: Promise) in
            guard let comm = self.communicator, let handler = self.callbackHandler else {
                return promise.reject("E_NO_DEVICE", "Not connected")
            }
            promises["setCustomProfile"] = promise
            installTimeout(for: "setCustomProfile", promise: promise)
            comm.setCallBack(#selector(handler.onSetCustomProfile(_:)), object: handler)
            // slight dispatch to ensure the stream is ready
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
              print("Setting Neoscan profile: ß", profile)
                comm.setCustomProfile(profile)
            }
        }
        
        Events(
            "onNeoScanData",
            "onNeoScanError",
            "onNeoScanDeviceConnected",
            "onNeoScanDeviceDisconnected"
        )
    }
    
    // MARK: - Timeout helpers
    
    /// Invalidate any existing timer, then schedule a new one
    private func installTimeout(for key: String, promise: Promise, interval: TimeInterval = 5.0) {
        currentTimeoutWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            self.promises[key] = nil
            promise.reject("E_TIMEOUT", "\(key) timed out")
        }
        currentTimeoutWorkItem = work
        
        // schedule on main queue (or any queue you like)
        DispatchQueue.main.asyncAfter(deadline: .now() + interval, execute: work)
    }
    
    /// Cancel the active timer as soon as we get any callback
    public func cancelTimeout() {
        currentTimeoutWorkItem?.cancel()
        currentTimeoutWorkItem = nil
    }
    
    // MARK: - Callback Handlers
    
    func handleGetConfiguration(_ configXml: NSString) {
        guard let promise = promises.removeValue(forKey: "getConfiguration") else { return }
        promise.resolve(configXml)
    }
    
    func handleSetCustomProfile(_ errorStr: NSString) {
        guard let promise = promises.removeValue(forKey: "setCustomProfile") else { return }
        if errorStr.isEqual(to: "Normal") {
            promise.resolve(true)
        } else {
            promise.reject("E_SET_PROFILE", errorStr as String)
        }
    }
    
    func handleGetImageList(_ xmlData: NSData, withError errorStr: NSString) {
        guard let promise = promises.removeValue(forKey: "getImageList") else { return }
        if errorStr.isEqual(to: "Normal"),
           let xmlString = String(data: xmlData as Data, encoding: .utf8) {
            let list = parseImageListXML(xmlString)
            promise.resolve(list)
        } else {
            promise.reject("E_IMAGE_LIST", errorStr as String)
        }
    }
    
    func handleGetImage(_ imageData: NSData, withError errorStr: NSString) {
        guard let promise = promises.removeValue(forKey: "getImage") else { return }
        if errorStr.isEqual(to: "Normal") {
            let raw = imageData as Data
            
            guard let imageName = currentImageName else {
                return promise.reject("E_GET_IMAGE", "Failed to get file extension")
            }
            let ext = (imageName as NSString).pathExtension.lowercased()
            
            // 3) Produce WSQ template
            let wsqData: Data?
            switch ext {
            case "wsq":
                wsqData = raw
            case "bmp":
                wsqData = bmpToWSQ(raw)
            case "png":
                wsqData = pngToWSQ(raw)
            default:
                wsqData = nil
            }
            guard let wsq = wsqData else {
                return promise.reject("E_CONVERT_WSQ", "Failed to convert to WSQ")
            }
            
            // 4) Produce PNG preview
            guard let previewPNG = makePNGPreview(from: raw, ext: ext) else {
                return promise.reject("E_PREVIEW", "Failed to generate PNG preview")
            }
            
            // 5) Resolve with both the WSQ (base64) and preview URI
            
            promise.resolve([
                "wsqBase64": wsq.base64EncodedString(),
                "previewBase64": previewPNG.base64EncodedString()
            ])
        } else {
            promise.reject("E_GET_IMAGE", errorStr as String)
        }
    }
    
    func handleUpdateTime(_ error: NSString) {
        guard let promise = promises.removeValue(forKey: "updateTime") else { return }
        if error.isEqual(to: "Normal") {
            promise.resolve(true)
        } else {
            promise.reject("E_UPDATE_TIME", error as String)
        }
    }
    
    // MARK: - Image Conversion Helpers
    func bmpToWSQ(_ bmp: Data, rate: Float = 0.75) -> Data? {
        var outPtr: UnsafeMutablePointer<UInt8>? = nil
        var outLen: Int32 = 0
        
        let rc: Int32 = bmp.withUnsafeBytes { rawBuf in
            
            let inPtr = rawBuf.bindMemory(to: UInt8.self).baseAddress!
            
            let mutableIn = UnsafeMutablePointer<UInt8>(mutating: inPtr)
            return BMPtoWSQ(
                mutableIn,
                Int32(bmp.count),
                rate,
                &outPtr,
                &outLen
            )
        }
        
        guard rc == 0, let ptr = outPtr, outLen > 0 else { return nil }
        let wsq = Data(bytes: ptr, count: Int(outLen))
        MemFree(ptr)
        return wsq
    }
    
    func pngToWSQ(_ png: Data, rate: Float = 0.75) -> Data? {
        var bmpPtr: UnsafeMutablePointer<UInt8>? = nil
        var bmpLen: Int32 = 0
        
        let rc1: Int32 = png.withUnsafeBytes { rawBuf in
            let inPtr = rawBuf.bindMemory(to: UInt8.self).baseAddress!
            let mutableIn = UnsafeMutablePointer<UInt8>(mutating: inPtr)
            return PNGtoBMP(mutableIn,
                            Int32(png.count),
                            &bmpPtr,
                            &bmpLen)
        }
        guard rc1 == 0, let bptr = bmpPtr, bmpLen > 0 else { return nil }
        let bmpData = Data(bytes: bptr, count: Int(bmpLen))
        MemFree(bptr)
        return bmpToWSQ(bmpData, rate: rate)
    }
    
    func makePNGPreview(from data: Data, ext: String) -> Data? {
        switch ext.lowercased() {
        case "png":
            // already PNG
            return data
            
        case "bmp", "wsq":
            // if it's WSQ, first turn it into raw BMP:
            let bmpData: Data
            if ext.lowercased() == "wsq" {
                var rawBMPPtr: UnsafeMutablePointer<UInt8>? = nil
                var rawBMPLen: Int32 = 0
                let rc = data.withUnsafeBytes { buf -> Int32 in
                    let inPtr = buf.bindMemory(to: UInt8.self).baseAddress!
                    return WSQtoBMP( UnsafeMutablePointer<UInt8>(mutating: inPtr),
                                     Int32(data.count),
                                     &rawBMPPtr,
                                     &rawBMPLen )
                }
                guard rc == 0, let p = rawBMPPtr, rawBMPLen > 0 else {
                    return nil
                }
                bmpData = Data(bytes: p, count: Int(rawBMPLen))
                MemFree(p)
            } else {
                bmpData = data
            }
            
            // now decode that BMP into a UIImage
            guard let uiImage = UIImage(data: bmpData) else {
                return nil
            }
            // and re‐encode as PNG
            return uiImage.pngData()
            
        default:
            return nil
        }
    }
    
    // MARK: - Private Helpers
    
    fileprivate let neoScanProtocol = "com.nec.NeoScan"
    
    private func findNeoScanAccessory() -> EAAccessory? {
        return EAAccessoryManager.shared()
            .connectedAccessories
            .first { $0.protocolStrings.contains(neoScanProtocol) }
    }
    
    private func connectNeoScan() -> Bool {
        guard findNeoScanAccessory() != nil else {
            return false
        }
        let handler = ScanCallbackHandler(module: self)
        self.callbackHandler = handler
        communicator = NeoScanBTCommunication()
        let bridge = NeoScanBridge()
        bridge.communicator = communicator
        neoScanBridge = bridge
        communicator?.setCallBack(
            #selector(bridge.receiveResponse(_:)),
            object: bridge
        )
        return communicator?.connectNeoScan(bridge) ?? false
    }
    
    private func parseImageListXML(_ xml: String) -> [String] {
        var results = [String]()
        let pattern = #"<Image\b[^>]*\bname="([^"]+)""#
        let re = try! NSRegularExpression(pattern: pattern, options: [])
        let ns = xml as NSString
        for m in re.matches(in: xml, range: NSRange(location: 0, length: ns.length)) {
            results.append(ns.substring(with: m.range(at: 1)))
        }
        return results
    }
}
