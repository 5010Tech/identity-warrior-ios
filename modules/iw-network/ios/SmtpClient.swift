import Foundation
import Network

/// What went wrong sending a message, in words fit to show the operator.
struct SmtpError: Error {
  let message: String
}

/// A small SMTP client: one message with one attachment, over a connection
/// that is encrypted from the start (as the Android app's NRTIO submission
/// does it). Each call blocks until the server answers or the time runs out,
/// so it is driven from a background queue.
final class SmtpClient {
  private let connection: NWConnection
  private let queue = DispatchQueue(label: "com.fiftyten.iw.smtp")
  private var buffer = Data()
  private let timeout: TimeInterval

  init(host: String, port: UInt16, trustHost: Bool, timeout: TimeInterval) throws {
    guard let nwPort = NWEndpoint.Port(rawValue: port) else {
      throw SmtpError(message: "Invalid port \(port)")
    }
    let tls = NWProtocolTLS.Options()
    if trustHost {
      // Accept this server's certificate as it is (a self-signed one).
      sec_protocol_options_set_verify_block(
        tls.securityProtocolOptions,
        { _, _, complete in complete(true) },
        queue
      )
    }
    self.timeout = timeout
    self.connection = NWConnection(
      host: NWEndpoint.Host(host),
      port: nwPort,
      using: NWParameters(tls: tls)
    )
  }

  /// Connects and waits for the encrypted link to be up.
  func open() throws {
    let ready = DispatchSemaphore(value: 0)
    var failure: String?
    var settled = false
    connection.stateUpdateHandler = { state in
      guard !settled else { return }
      switch state {
      case .ready:
        settled = true
        ready.signal()
      case .failed(let error), .waiting(let error):
        settled = true
        failure = error.localizedDescription
        ready.signal()
      case .cancelled:
        settled = true
        failure = "Connection cancelled"
        ready.signal()
      default:
        break
      }
    }
    connection.start(queue: queue)
    if ready.wait(timeout: .now() + timeout) == .timedOut {
      throw SmtpError(message: "Timed out connecting to the mail server")
    }
    if let failure {
      throw SmtpError(message: "Could not connect to the mail server: \(failure)")
    }
  }

  func close() {
    connection.stateUpdateHandler = nil
    connection.cancel()
  }

  private func send(_ data: Data) throws {
    let done = DispatchSemaphore(value: 0)
    var failure: String?
    connection.send(content: data, completion: .contentProcessed { error in
      failure = error?.localizedDescription
      done.signal()
    })
    if done.wait(timeout: .now() + timeout) == .timedOut {
      throw SmtpError(message: "Timed out sending to the mail server")
    }
    if let failure {
      throw SmtpError(message: "The connection to the mail server was lost: \(failure)")
    }
  }

  private func sendLine(_ line: String) throws {
    try send(Data((line + "\r\n").utf8))
  }

  /// More bytes from the server into the buffer.
  private func receiveMore() throws {
    let done = DispatchSemaphore(value: 0)
    var failure: String?
    connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, isComplete, error in
      if let data, !data.isEmpty {
        self.buffer.append(data)
      } else if let error {
        failure = error.localizedDescription
      } else if isComplete {
        failure = "The mail server closed the connection"
      }
      done.signal()
    }
    if done.wait(timeout: .now() + timeout) == .timedOut {
      throw SmtpError(message: "Timed out waiting for the mail server")
    }
    if let failure {
      throw SmtpError(message: failure)
    }
  }

  /// The next line from the server, without its line ending.
  private func readLine() throws -> String {
    while true {
      if let newline = buffer.firstIndex(of: 0x0A) {
        let lineData = buffer.subdata(in: buffer.startIndex..<newline)
        buffer.removeSubrange(buffer.startIndex...newline)
        let line = String(decoding: lineData, as: UTF8.self)
        return line.hasSuffix("\r") ? String(line.dropLast()) : line
      }
      try receiveMore()
    }
  }

  /// A whole reply: its code and every line of its text.
  private func readReply() throws -> (code: Int, lines: [String]) {
    var lines: [String] = []
    while true {
      let line = try readLine()
      guard line.count >= 3, let code = Int(line.prefix(3)) else {
        throw SmtpError(message: "Unexpected answer from the mail server: \(line)")
      }
      lines.append(String(line.dropFirst(min(4, line.count))))
      // "250-..." continues; "250 ..." (or a bare code) is the last line.
      let continues = line.count > 3 && line[line.index(line.startIndex, offsetBy: 3)] == "-"
      if !continues {
        return (code, lines)
      }
    }
  }

  /// Reads a reply and insists on one of the expected codes.
  @discardableResult
  private func expect(_ codes: [Int], during step: String) throws -> [String] {
    let reply = try readReply()
    guard codes.contains(reply.code) else {
      throw SmtpError(
        message: "\(step): \(reply.code) \(reply.lines.joined(separator: " "))"
      )
    }
    return reply.lines
  }

  private func command(_ line: String, expect codes: [Int], during step: String) throws -> [String] {
    try sendLine(line)
    return try expect(codes, during: step)
  }

  /// Signs in and hands the message over.
  func deliver(
    user: String,
    password: String,
    from: String,
    to: String,
    message: Data
  ) throws {
    try expect([220], during: "Mail server greeting")
    let features = try command("EHLO identitywarrior", expect: [250], during: "EHLO")
    let auth = features
      .first { $0.uppercased().hasPrefix("AUTH") }?
      .uppercased() ?? ""

    if auth.contains("PLAIN") || !auth.contains("LOGIN") {
      let token = Data("\u{0}\(user)\u{0}\(password)".utf8).base64EncodedString()
      _ = try command("AUTH PLAIN \(token)", expect: [235], during: "Sign-in")
    } else {
      _ = try command("AUTH LOGIN", expect: [334], during: "Sign-in")
      _ = try command(Data(user.utf8).base64EncodedString(), expect: [334], during: "Sign-in")
      _ = try command(Data(password.utf8).base64EncodedString(), expect: [235], during: "Sign-in")
    }

    _ = try command("MAIL FROM:<\(from)>", expect: [250], during: "Sender")
    _ = try command("RCPT TO:<\(to)>", expect: [250, 251], during: "Recipient")
    _ = try command("DATA", expect: [354], during: "Message")
    try send(message)
    try send(Data("\r\n.\r\n".utf8))
    try expect([250], during: "Message")
    // The message is accepted; a missing goodbye changes nothing.
    try? sendLine("QUIT")
  }

  /// One message carrying one file, as the Android app builds it: no text,
  /// just the attachment.
  static func message(from: String, to: String, fileName: String, file: Data) -> Data {
    let boundary = "----=_IW_\(UUID().uuidString)"
    let domain = from.split(separator: "@").last.map(String.init) ?? "identitywarrior"
    let date = DateFormatter()
    date.locale = Locale(identifier: "en_US_POSIX")
    date.dateFormat = "EEE, dd MMM yyyy HH:mm:ss Z"
    // Quotes and line breaks have no place in a header value.
    let safeName = fileName
      .replacingOccurrences(of: "\"", with: "")
      .replacingOccurrences(of: "\r", with: "")
      .replacingOccurrences(of: "\n", with: "")

    var text = ""
    text += "Date: \(date.string(from: Date()))\r\n"
    text += "From: \(from)\r\n"
    text += "Sender: \(from)\r\n"
    text += "To: \(to)\r\n"
    text += "Message-ID: <\(UUID().uuidString)@\(domain)>\r\n"
    text += "MIME-Version: 1.0\r\n"
    text += "Content-Type: multipart/mixed; boundary=\"\(boundary)\"\r\n"
    text += "\r\n"
    text += "--\(boundary)\r\n"
    text += "Content-Type: application/octet-stream; name=\"\(safeName)\"\r\n"
    text += "Content-Transfer-Encoding: base64\r\n"
    text += "Content-Disposition: attachment; filename=\"\(safeName)\"\r\n"
    text += "\r\n"
    // 76-character lines; base64 never starts a line with a full stop, so
    // the body needs no escaping for the end-of-message marker.
    text += file.base64EncodedString(
      options: [.lineLength76Characters, .endLineWithCarriageReturn, .endLineWithLineFeed]
    )
    text += "\r\n--\(boundary)--"
    return Data(text.utf8)
  }
}
