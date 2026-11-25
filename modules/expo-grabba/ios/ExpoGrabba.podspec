Pod::Spec.new do |s|
  s.name           = 'ExpoGrabba'
  s.version        = '1.0.0'
  s.summary        = 'Grabba A-Series (Bluetooth LE) for Identity Warrior'
  s.description    = 'Finds, connects to and scans with a Grabba A-Series device through the GrabbaWirelessSDK.'
  s.author         = '5010 Tech'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # The vendor's SDK (version 0.4), as delivered.
  s.vendored_frameworks = 'GrabbaWirelessSDK.xcframework'
  s.frameworks = 'CoreBluetooth'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "*.{h,m,mm,swift}"
end
