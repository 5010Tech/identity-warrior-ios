require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
    s.name         = package["name"]
    s.version      = package["version"]
    s.summary      = package["description"]
    s.homepage     = package["homepage"]
    s.license      = package["license"]
    s.authors      = package["author"]
  
    s.ios.deployment_target = '17.0'

    s.source = { :path => '.' }

    s.vendored_frameworks = "SlapshotCaptureSDK.xcframework"
    s.preserve_paths = "*"

    s.dependency "CocoaLumberjack/Swift", "3.8.0"
    s.dependency "DeviceKit", "5.4.0"
end
