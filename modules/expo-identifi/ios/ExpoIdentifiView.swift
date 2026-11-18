import ExpoModulesCore
import UIKit

public enum ExpoIdentifiStreamType: String {
  case finger
  case irisLeft
  case irisRight
}

public class ExpoIdentifiView: ExpoView {
  private let imageView = UIImageView()
  private let lineLayer = CALayer()
  private var registeredStreamType: ExpoIdentifiStreamType?

  public var streamType: ExpoIdentifiStreamType = .finger {
    didSet {
      guard registeredStreamType != streamType else { return }
      if let registeredStreamType {
        ExpoIdentifiModule.unregisterView(self, for: registeredStreamType)
      }
      ExpoIdentifiModule.registerView(self, for: streamType)
      registeredStreamType = streamType
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    imageView.contentMode = .scaleAspectFit
    imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(imageView)

    lineLayer.isHidden = true
    lineLayer.anchorPoint = CGPoint(x: 0.5, y: 0.0)
    layer.addSublayer(lineLayer)

    imageView.backgroundColor = UIColor(
      red: CGFloat(0xF8) / 255.0,
      green: CGFloat(0xF8) / 255.0,
      blue: CGFloat(0xF8) / 255.0,
      alpha: CGFloat(0xFF) / 255.0
    )

    ExpoIdentifiModule.registerView(self, for: streamType)
    registeredStreamType = streamType
  }

  deinit {
    if let registeredStreamType {
      ExpoIdentifiModule.unregisterView(self, for: registeredStreamType)
    }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    imageView.frame = bounds

    let imgRect = currentImageRect()
    let scale = UIScreen.main.scale
    lineLayer.bounds.size.width = 2.0 / scale
    lineLayer.bounds.size.height = imgRect.height
    lineLayer.position.y = imgRect.minY
  }

  public override var intrinsicContentSize: CGSize {
    if let image = imageView.image {
      let containerWidth = bounds.width
      let aspectRatio = image.size.height / image.size.width
      return CGSize(width: containerWidth, height: containerWidth * aspectRatio)
    }
    return super.intrinsicContentSize
  }

  public func updateImage(with image: UIImage) {
    DispatchQueue.main.async {
      self.imageView.image = image
      self.setNeedsLayout()
      self.layoutIfNeeded()
    }
  }

  public func updateImage(with image: UIImage, rollingState: Int32, verticalLineX: Int32) {
    DispatchQueue.main.async {
      self.imageView.image = image
      self.setNeedsLayout()
      self.layoutIfNeeded()
      self.updateVerticalLine(x: CGFloat(verticalLineX), state: Int(rollingState))
    }
  }

  @objc public func setVerticalLineX(_ x: CGFloat) {
    updateVerticalLine(x: x, state: currentState)
  }

  @objc public func setRollingState(_ state: Int) {
    currentState = state
    updateVerticalLine(x: lastX ?? -1, state: state)
  }

  private var lastX: CGFloat?
  private var currentState: Int = 0

  private func currentImageRect() -> CGRect {
    guard let img = imageView.image, imageView.bounds.width > 0, imageView.bounds.height > 0 else {
      return .zero
    }

    let viewSize = imageView.bounds.size
    let imageSize = img.size
    let scale = min(viewSize.width / imageSize.width, viewSize.height / imageSize.height)
    let size = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
    let origin = CGPoint(
      x: (viewSize.width - size.width) / 2.0,
      y: (viewSize.height - size.height) / 2.0
    )
    return CGRect(origin: origin, size: size)
  }

  private func updateVerticalLine(x: CGFloat, state: Int) {
    lastX = x

    switch state {
    case 0:
      lineLayer.isHidden = true
      return
    case 1:
      lineLayer.backgroundColor = UIColor.red.cgColor
    case 2:
      lineLayer.backgroundColor = UIColor.green.cgColor
    default:
      lineLayer.isHidden = true
      return
    }

    let imgRect = currentImageRect()
    guard imgRect.width > 0 else {
      lineLayer.isHidden = true
      return
    }

    guard x >= imgRect.minX, x <= imgRect.maxX else {
      lineLayer.isHidden = true
      return
    }

    let scale = UIScreen.main.scale
    lineLayer.bounds.size = CGSize(width: 2.0 / scale, height: imgRect.height)
    lineLayer.position.y = imgRect.minY

    let alignedCenterX = (x * scale).rounded() / scale
    lineLayer.position.x = alignedCenterX
    lineLayer.isHidden = false
  }
}
