Pod::Spec.new do |s|
  s.name           = 'ExpoIdentifi'
  s.version        = '1.0.0'
  s.summary        = 'A sample project summary'
  s.description    = 'A sample project description'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.license      = { :type => "MIT", :file => "LICENSE" }

  s.vendored_libraries = "libIdentifi.a"
  s.dependency 'ExpoModulesCore'
  # For its WSQ encoder: a four-finger slap kept as one image (MAP, CAR).
  s.dependency 'slapshot-sdk'

  s.public_header_files = "ExpoIdentifi.h", "IdentiFI.h"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
