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

    s.vendored_frameworks = "SlapshotCaptureSDKVisionFacePlugin.xcframework"
    s.preserve_paths = "*"

    s.dependency "slapshot-sdk"
end
