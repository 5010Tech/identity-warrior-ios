import UIKit
import SwiftUI

class SwiftUIWrapper<T: View>: UIViewController {
  
  var hostedView: T

  init(hostedView: T) {
    self.hostedView = hostedView
    super.init(nibName: nil, bundle: nil)
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
  
  override func viewDidLoad() {
    super.viewDidLoad()
    let view = hostedView

    let hostingController = UIHostingController(rootView: view)
    
    addChild(hostingController)
    // make the background of our view wrapper clear
    self.view.backgroundColor = .clear
    self.view.addSubview(hostingController.view)
    
    hostingController.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hostingController.view.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
      hostingController.view.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
      hostingController.view.topAnchor.constraint(equalTo: self.view.topAnchor),
      hostingController.view.bottomAnchor.constraint(equalTo: self.view.bottomAnchor),
    ])
    
    hostingController.didMove(toParent: self)

    // alsp make the background of our hostingController clear (or else it will be black)
    hostingController.view.backgroundColor = .clear
  }
}
