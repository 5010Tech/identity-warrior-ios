Pod::Spec.new do |s|
  s.name           = 'ExpoNeoScan'
  s.version        = '1.0.0'
  s.summary        = 'iOS Wrapper for NeoScan SDK'
  s.description    = 'iOS Wrapper for NeoScan SDK'
  s.author         = 'SNA International'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '13.4', :tvos => '13.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'OTHER_LDFLAGS' => '$(inherited) -ld64'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.vendored_libraries = [
    'libNECNeoScanLibiOS.a',
    'libFreeImage.a',
  ]
    s.public_header_files = [
    'NECNeoScan.h',
    'NeoScanBridge.h',
    'EADSessionController.h',
    'FreeImage.h',
  ]

end
