import ExpoModulesCore
import Foundation
import UIKit
import UniformTypeIdentifiers

/// Hands back the file the operator picked in the system's file browser.
private final class FilePickerDelegate: NSObject, UIDocumentPickerDelegate {
  var onDone: ((URL?) -> Void)?

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    onDone?(urls.first)
    onDone = nil
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    onDone?(nil)
    onDone = nil
  }
}

/// Accepts the server's certificate as it is, for one named host only. Any
/// other host, and any redirect elsewhere, gets the normal checks.
private final class TrustHostDelegate: NSObject, URLSessionDelegate {
  private let host: String

  init(host: String) {
    self.host = host
  }

  func urlSession(
    _ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
  ) {
    let space = challenge.protectionSpace
    guard space.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          space.host == host,
          let trust = space.serverTrust
    else {
      completionHandler(.performDefaultHandling, nil)
      return
    }
    completionHandler(.useCredential, URLCredential(trust: trust))
  }
}

/// One HTTPS request, for servers the normal fetch refuses: a BioCore server
/// on a local network with a self-signed certificate (the "allow self-signed
/// certificate" switch in ABIS settings, as on Android).
public class IwNetworkModule: Module {
  // Kept while the file browser is open.
  private var filePicker: FilePickerDelegate?

  public func definition() -> ModuleDefinition {
    Name("IwNetwork")

    // The system's file browser, for one file of any kind (a license file).
    // Resolves with its name and content, or nil if the operator cancelled.
    AsyncFunction("pickFile") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("E_PICKER", "No screen to show the file browser on")
          return
        }
        let picker: UIDocumentPickerViewController
        if #available(iOS 14.0, *) {
          picker = UIDocumentPickerViewController(
            forOpeningContentTypes: [UTType.item], asCopy: true
          )
        } else {
          picker = UIDocumentPickerViewController(documentTypes: ["public.item"], in: .import)
        }
        let delegate = FilePickerDelegate()
        delegate.onDone = { url in
          self.filePicker = nil
          guard let url else {
            promise.resolve(nil)
            return
          }
          do {
            let data = try Data(contentsOf: url)
            promise.resolve([
              "name": url.lastPathComponent,
              "base64": data.base64EncodedString(),
            ])
          } catch {
            promise.reject("E_PICKER", error.localizedDescription)
          }
        }
        self.filePicker = delegate
        picker.delegate = delegate
        picker.allowsMultipleSelection = false
        presenter.present(picker, animated: true)
      }
    }

    AsyncFunction("request") { (options: [String: Any], promise: Promise) in
      guard let urlText = options["url"] as? String,
            let url = URL(string: urlText),
            url.scheme == "https",
            let host = url.host
      else {
        promise.reject("E_URL", "Not an https address")
        return
      }

      var request = URLRequest(url: url)
      request.httpMethod = (options["method"] as? String) ?? "GET"
      request.timeoutInterval = (options["timeoutSeconds"] as? Double) ?? 60
      for (name, value) in (options["headers"] as? [String: String]) ?? [:] {
        request.setValue(value, forHTTPHeaderField: name)
      }
      if let base64 = options["bodyBase64"] as? String {
        request.httpBody = Data(base64Encoded: base64)
      } else if let text = options["body"] as? String {
        request.httpBody = text.data(using: .utf8)
      }

      let allowSelfSigned = (options["allowSelfSigned"] as? Bool) ?? false
      let config = URLSessionConfiguration.ephemeral
      let session = URLSession(
        configuration: config,
        delegate: allowSelfSigned ? TrustHostDelegate(host: host) : nil,
        delegateQueue: nil
      )

      session.dataTask(with: request) { data, response, error in
        defer { session.finishTasksAndInvalidate() }
        if let error = error as NSError? {
          // The system's own error code tells a certificate problem
          // (-1202 and its neighbours) from an unreachable server.
          promise.reject("E_NETWORK_\(error.code)", error.localizedDescription)
          return
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        promise.resolve(["status": status, "body": body])
      }.resume()
    }

    // One e-mail with one file attached, over SMTP on a connection that is
    // encrypted from the start: how a transaction goes to NRTIO.
    AsyncFunction("sendMail") { (options: [String: Any], promise: Promise) in
      guard let host = options["host"] as? String, !host.isEmpty,
            let user = options["user"] as? String,
            let password = options["password"] as? String,
            let from = options["from"] as? String,
            let to = options["to"] as? String,
            let fileName = options["fileName"] as? String,
            let base64 = options["attachmentBase64"] as? String,
            let file = Data(base64Encoded: base64)
      else {
        promise.reject("E_MAIL_OPTIONS", "Incomplete mail request")
        return
      }
      // A number from JavaScript arrives as a Double.
      let portNumber = (options["port"] as? Double).map { Int($0) }
        ?? (options["port"] as? Int) ?? 465
      let port = UInt16(clamping: portNumber)
      let trustHost = (options["allowSelfSigned"] as? Bool) ?? false
      let timeout = (options["timeoutSeconds"] as? Double) ?? 60

      DispatchQueue.global(qos: .userInitiated).async {
        var client: SmtpClient?
        do {
          let smtp = try SmtpClient(host: host, port: port, trustHost: trustHost, timeout: timeout)
          client = smtp
          try smtp.open()
          try smtp.deliver(
            user: user,
            password: password,
            from: from,
            to: to,
            message: SmtpClient.message(from: from, to: to, fileName: fileName, file: file)
          )
          smtp.close()
          promise.resolve(["sent": true])
        } catch let error as SmtpError {
          client?.close()
          promise.reject("E_MAIL", error.message)
        } catch {
          client?.close()
          promise.reject("E_MAIL", error.localizedDescription)
        }
      }
    }
  }
}
