
struct ReviewRequest: Codable {
    var identityId: String
    var capturedModalityId: String
    var isMutable: Bool?
    var showImagesInReview: Bool?
}
