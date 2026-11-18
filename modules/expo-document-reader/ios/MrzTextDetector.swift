import Foundation
import Vision

struct RecognizedMrzFragment {
  let text: String
  let boundingBox: CGRect
  let confidence: Float
}

struct RecognizedMrzRow {
  let text: String
  let boundingBox: CGRect
  let fragmentCount: Int
}

struct MrzDetectionResult {
  let fragments: [RecognizedMrzFragment]
  let rows: [RecognizedMrzRow]
  let guidanceRows: [RecognizedMrzRow]
  let detectedText: String?

  var hasSignal: Bool {
    !fragments.isEmpty
  }

  var combinedBox: CGRect? {
    guard let first = rows.first?.boundingBox ?? fragments.first?.boundingBox else {
      return nil
    }

    let remainder = rows.isEmpty ? fragments.dropFirst().map(\.boundingBox) : rows.dropFirst().map(\.boundingBox)
    return remainder.reduce(first) { partial, box in
      partial.union(box)
    }
  }

  var longestFragmentLength: Int {
    fragments.map { $0.text.count }.max() ?? 0
  }

  var longestRowLength: Int {
    rows.map { $0.text.count }.max() ?? 0
  }

  var guidanceRowCount: Int {
    guidanceRows.count
  }

  var longestGuidanceRowLength: Int {
    guidanceRows.map { $0.text.count }.max() ?? 0
  }

  var guidanceBox: CGRect? {
    guard let first = guidanceRows.first?.boundingBox else {
      return nil
    }

    return guidanceRows.dropFirst().map(\.boundingBox).reduce(first) { partial, box in
      partial.union(box)
    }
  }

  var rowLengthsDescription: String {
    if rows.isEmpty {
      return "[]"
    }
    return "[" + rows.map { String($0.text.count) }.joined(separator: ",") + "]"
  }
}

enum MrzTextDetector {
  private static let td3Length = 44
  private static let td1Length = 30

  static func detect(in observations: [VNRecognizedTextObservation]) -> String? {
    analyze(in: observations).detectedText
  }

  static func analyze(in observations: [VNRecognizedTextObservation]) -> MrzDetectionResult {
    let fragments = extractFragments(from: observations)
    let rows = mergeRows(from: fragments)
    let guidanceRows = rows.filter(looksLikeGuidanceRow)

    if let match = findTd3(rows: rows) {
      return MrzDetectionResult(fragments: fragments, rows: rows, guidanceRows: guidanceRows, detectedText: match)
    }

    if let match = findTd1(rows: rows) {
      return MrzDetectionResult(fragments: fragments, rows: rows, guidanceRows: guidanceRows, detectedText: match)
    }

    return MrzDetectionResult(fragments: fragments, rows: rows, guidanceRows: guidanceRows, detectedText: nil)
  }

  static func normalize(_ text: String) -> String {
    let uppercased = text.uppercased()
    var normalized = ""
    normalized.reserveCapacity(uppercased.count)

    for scalar in uppercased.unicodeScalars {
      switch scalar {
      case "A"..."Z", "0"..."9", "<":
        normalized.append(Character(scalar))
      case " ", "-", "_", "=", ".", ",", "«":
        normalized.append("<")
      default:
        continue
      }
    }

    let collapsed = normalized.replacingOccurrences(of: #"<{3,}"#, with: "<<", options: .regularExpression)
    return collapsed.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private static func extractFragments(from observations: [VNRecognizedTextObservation]) -> [RecognizedMrzFragment] {
    observations.compactMap { observation in
      let candidates = observation.topCandidates(3)
      guard !candidates.isEmpty else {
        return nil
      }

      let best = candidates
        .compactMap { candidate -> RecognizedMrzFragment? in
          let normalized = normalize(candidate.string)
          let candidateBox = candidateBoundingBox(for: candidate) ?? observation.boundingBox
          return RecognizedMrzFragment(text: normalized, boundingBox: candidateBox, confidence: candidate.confidence)
        }
        .filter { looksLikeMrzFragment($0.text, boundingBox: $0.boundingBox) }
        .max { lhs, rhs in
          score(fragment: lhs) < score(fragment: rhs)
        }

      return best
    }
    .sorted {
      if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.01 {
        return $0.boundingBox.midY > $1.boundingBox.midY
      }
      return $0.boundingBox.minX < $1.boundingBox.minX
    }
  }

  private static func mergeRows(from fragments: [RecognizedMrzFragment]) -> [RecognizedMrzRow] {
    guard !fragments.isEmpty else {
      return []
    }

    var grouped: [[RecognizedMrzFragment]] = []
    let verticalTolerance: CGFloat = 0.055

    for fragment in fragments {
      if let index = grouped.firstIndex(where: { group in
        guard let anchor = group.first else { return false }
        return abs(anchor.boundingBox.midY - fragment.boundingBox.midY) <= verticalTolerance
      }) {
        grouped[index].append(fragment)
      } else {
        grouped.append([fragment])
      }
    }

    let rows = grouped.compactMap { group -> RecognizedMrzRow? in
      let sorted = group.sorted { $0.boundingBox.minX < $1.boundingBox.minX }
      guard let first = sorted.first else {
        return nil
      }

      var text = first.text
      var box = first.boundingBox

      for fragment in sorted.dropFirst() {
        text = mergeFragmentText(current: text, next: fragment.text)
        box = box.union(fragment.boundingBox)
      }

      let repaired = repairCommonOcrConfusions(in: text)
      guard repaired.count >= 24 else {
        return nil
      }

      return RecognizedMrzRow(text: repaired, boundingBox: box, fragmentCount: sorted.count)
    }

    return rows
      .sorted { lhs, rhs in
        if abs(lhs.boundingBox.midY - rhs.boundingBox.midY) > 0.01 {
          return lhs.boundingBox.midY > rhs.boundingBox.midY
        }
        return lhs.boundingBox.minX < rhs.boundingBox.minX
      }
  }

  private static func candidateBoundingBox(for candidate: VNRecognizedText) -> CGRect? {
    let text = candidate.string
    guard !text.isEmpty,
          let boxObservation = try? candidate.boundingBox(for: text.startIndex..<text.endIndex) else {
      return nil
    }

    return boxObservation.boundingBox
  }

  private static func mergeFragmentText(current: String, next: String) -> String {
    guard !current.isEmpty else {
      return next
    }
    guard !next.isEmpty else {
      return current
    }
    if current.contains(next) {
      return current
    }
    if next.contains(current) {
      return next
    }

    let maxOverlap = min(current.count, next.count, 10)
    if maxOverlap >= 2 {
      for overlap in stride(from: maxOverlap, through: 2, by: -1) {
        let suffix = String(current.suffix(overlap))
        let prefix = String(next.prefix(overlap))
        if suffix == prefix {
          return current + String(next.dropFirst(overlap))
        }
      }
    }

    return current + next
  }

  private static func repairCommonOcrConfusions(in line: String) -> String {
    var repaired = line
      .replacingOccurrences(of: "K<", with: "<<")
      .replacingOccurrences(of: "<K", with: "<<")
      .replacingOccurrences(of: " «", with: "<<")

    if repaired.hasPrefix("PK") {
      repaired.replaceSubrange(repaired.index(after: repaired.startIndex)..<repaired.index(repaired.startIndex, offsetBy: 2), with: "<")
      repaired = "P" + repaired.dropFirst()
    }
    if repaired.hasPrefix("PA") || repaired.hasPrefix("PN") || repaired.hasPrefix("PV") || repaired.hasPrefix("PI") {
      let secondIndex = repaired.index(after: repaired.startIndex)
      repaired.replaceSubrange(secondIndex...secondIndex, with: "<")
    }

    return repaired
  }

  private static func looksLikeMrzFragment(_ text: String, boundingBox: CGRect) -> Bool {
    guard text.count >= 8 else {
      return false
    }
    guard text.range(of: #"^[A-Z0-9<]+$"#, options: .regularExpression) != nil else {
      return false
    }

    let aspectRatio = boundingBox.height > 0 ? boundingBox.width / boundingBox.height : 0
    guard boundingBox.width >= 0.06,
          boundingBox.height >= 0.02,
          boundingBox.height <= 0.35,
          aspectRatio >= 1.2 else {
      return false
    }

    let containsFiller = text.contains("<")
    let digitCount = text.filter(\.isNumber).count
    let letterCount = text.filter(\.isLetter).count

    return containsFiller || digitCount >= 5 || (letterCount >= 8 && text.count >= 12)
  }

  private static func looksLikeGuidanceRow(_ row: RecognizedMrzRow) -> Bool {
    let box = row.boundingBox
    let aspectRatio = box.height > 0 ? box.width / box.height : 0

    guard row.text.count >= 24,
          box.width >= 0.30,
          box.height >= 0.04,
          box.height <= 0.35,
          aspectRatio >= 4.0 else {
      return false
    }

    return true
  }

  private static func score(fragment: RecognizedMrzFragment) -> Int {
    let text = fragment.text
    let containsFillerScore = text.contains("<") ? 12 : 0
    let lengthScore = min(text.count, td3Length)
    let confidenceScore = Int(fragment.confidence * 10)
    let aspectRatio = fragment.boundingBox.height > 0 ? fragment.boundingBox.width / fragment.boundingBox.height : 0
    let geometryScore = Int(min(max(aspectRatio, 0), 12))
    return containsFillerScore + lengthScore + confidenceScore + geometryScore
  }

  private static func findTd3(rows: [RecognizedMrzRow]) -> String? {
    guard rows.count >= 2 else {
      return nil
    }

    for index in 0..<(rows.count - 1) {
      let firstVariants = td3FirstLineVariants(for: rows[index].text)
      let secondVariants = td3SecondLineVariants(for: rows[index + 1].text)

      for first in firstVariants {
        guard isLikelyTd3Line(first, firstLine: true) else { continue }
        let normalizedFirst = pad(line: first, to: td3Length)

        for second in secondVariants {
          guard let validatedSecond = validatedTd3SecondLine(second) else {
            continue
          }
          return "\(normalizedFirst)\n\(validatedSecond)"
        }
      }
    }

    return nil
  }

  private static func findTd1(rows: [RecognizedMrzRow]) -> String? {
    guard rows.count >= 3 else {
      return nil
    }

    for index in 0..<(rows.count - 2) {
      let first = normalizeTd1(rows[index].text)
      let second = normalizeTd1(rows[index + 1].text)
      let third = normalizeTd1(rows[index + 2].text)

      if isLikelyTd1Line(first) && isLikelyTd1Line(second) && isLikelyTd1Line(third) {
        return "\(pad(line: first, to: td1Length))\n\(pad(line: second, to: td1Length))\n\(pad(line: third, to: td1Length))"
      }
    }

    return nil
  }

  private static func td3FirstLineVariants(for line: String) -> [String] {
    let normalized = line.replacingOccurrences(of: " ", with: "<")
    var variants = Set<String>()
    variants.insert(normalized)
    variants.insert(normalized.replacingOccurrences(of: "K", with: "<"))
    variants.insert(normalized.replacingOccurrences(of: " «", with: "<<"))

    return variants
      .map { variant in
        var adjusted = variant
        if adjusted.hasPrefix("P") && adjusted.count >= 2 {
          let second = adjusted.index(after: adjusted.startIndex)
          if adjusted[second] != "<" {
            adjusted.replaceSubrange(second...second, with: "<")
          }
        }
        return adjusted
      }
      .sorted { $0.count > $1.count }
  }

  private static func td3SecondLineVariants(for line: String) -> [String] {
    let normalized = line.replacingOccurrences(of: " ", with: "<")
    let oToZero = normalized.replacingOccurrences(of: "O", with: "0")
    let iToOne = normalized.replacingOccurrences(of: "I", with: "1")
    let sToFive = normalized.replacingOccurrences(of: "S", with: "5")
    let zToTwo = normalized.replacingOccurrences(of: "Z", with: "2")
    let bToEight = normalized.replacingOccurrences(of: "B", with: "8")
    return Array(Set([normalized, oToZero, iToOne, sToFive, zToTwo, bToEight, oToZero.replacingOccurrences(of: "I", with: "1")]))
      .sorted { $0.count > $1.count }
  }

  private static func normalizeTd1(_ line: String) -> String {
    line.replacingOccurrences(of: "O", with: "0")
      .replacingOccurrences(of: "I", with: "1")
  }

  private static func pad(line: String, to targetLength: Int) -> String {
    if line.count >= targetLength {
      return String(line.prefix(targetLength))
    }
    return line + String(repeating: "<", count: targetLength - line.count)
  }

  private static func isLikelyTd3Line(_ line: String, firstLine: Bool) -> Bool {
    guard line.count >= 36 && line.count <= 48 else {
      return false
    }

    if firstLine {
      return line.hasPrefix("P<") || line.hasPrefix("V<") || line.hasPrefix("I<")
    }

    return line.range(of: #"^[A-Z0-9<]{36,48}$"#, options: .regularExpression) != nil
  }

  private static func isLikelyTd1Line(_ line: String) -> Bool {
    guard line.count >= 26 && line.count <= 34 else {
      return false
    }

    return line.range(of: #"^[A-Z0-9<]{26,34}$"#, options: .regularExpression) != nil
  }

  private static func validatedTd3SecondLine(_ line: String) -> String? {
    var characters = Array(pad(line: line, to: td3Length))
    guard characters.count == td3Length else {
      return nil
    }

    // Normalize numeric-heavy fields before checks.
    normalizeDigits(in: &characters, range: 13..<20, allowFillers: false)
    normalizeDigits(in: &characters, range: 21..<28, allowFillers: false)
    normalizeDigits(in: &characters, range: 42..<44, allowFillers: false)

    // Normalize sex field.
    if !["M", "F", "X", "<"].contains(String(characters[20])) {
      characters[20] = "<"
    }

    guard looksLikeDate(Array(characters[13..<19])), looksLikeDate(Array(characters[21..<27])) else {
      return nil
    }

    // Repair check digits from reconstructed fields.
    characters[19] = checkDigit(for: Array(characters[13..<19]))
    characters[27] = checkDigit(for: Array(characters[21..<27]))
    characters[9] = checkDigit(for: Array(characters[0..<9]))
    characters[43] = checkDigit(for: Array(characters[0..<10] + characters[13..<20] + characters[21..<43]))

    let candidate = String(characters)
    guard isLikelyTd3Line(candidate, firstLine: false) else {
      return nil
    }
    guard validateTd3SecondLine(candidate) else {
      return nil
    }
    return candidate
  }

  private static func normalizeDigits(in characters: inout [Character], range: Range<Int>, allowFillers: Bool) {
    for index in range {
      guard index < characters.count else { continue }
      if let mapped = mappedDigit(for: characters[index]) {
        characters[index] = mapped
      } else if characters[index] == "<" && allowFillers {
        continue
      }
    }
  }

  private static func mappedDigit(for character: Character) -> Character? {
    switch character {
    case "0"..."9":
      return character
    case "O", "Q", "D", "U":
      return "0"
    case "I", "L":
      return "1"
    case "Z":
      return "2"
    case "S":
      return "5"
    case "G":
      return "6"
    case "B":
      return "8"
    default:
      return nil
    }
  }

  private static func looksLikeDate(_ characters: [Character]) -> Bool {
    guard characters.count == 6 else {
      return false
    }
    let string = String(characters)
    guard string.range(of: #"^\d{6}$"#, options: .regularExpression) != nil else {
      return false
    }

    let monthStart = string.index(string.startIndex, offsetBy: 2)
    let dayStart = string.index(string.startIndex, offsetBy: 4)
    let month = Int(string[monthStart..<dayStart]) ?? 0
    let day = Int(string[dayStart..<string.endIndex]) ?? 0
    return (1...12).contains(month) && (1...31).contains(day)
  }

  private static func validateTd3SecondLine(_ line: String) -> Bool {
    guard line.count == td3Length else {
      return false
    }
    let chars = Array(line)
    guard checkDigit(for: Array(chars[0..<9])) == chars[9] else { return false }
    guard checkDigit(for: Array(chars[13..<19])) == chars[19] else { return false }
    guard checkDigit(for: Array(chars[21..<27])) == chars[27] else { return false }
    guard checkDigit(for: Array(chars[0..<10] + chars[13..<20] + chars[21..<43])) == chars[43] else { return false }
    return looksLikeDate(Array(chars[13..<19])) && looksLikeDate(Array(chars[21..<27]))
  }

  private static func checkDigit(for characters: [Character]) -> Character {
    let weights = [7, 3, 1]
    let sum = characters.enumerated().reduce(0) { partial, element in
      partial + mrzValue(for: element.element) * weights[element.offset % 3]
    }
    return Character(String(sum % 10))
  }

  private static func mrzValue(for character: Character) -> Int {
    switch character {
    case "0"..."9":
      return Int(String(character)) ?? 0
    case "A"..."Z":
      let scalar = character.unicodeScalars.first!.value
      let a = Character("A").unicodeScalars.first!.value
      return Int(scalar - a) + 10
    case "<":
      return 0
    default:
      if let mapped = mappedDigit(for: character) {
        return mrzValue(for: mapped)
      }
      return 0
    }
  }
}
