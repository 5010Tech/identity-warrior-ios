Pod::Spec.new do |s|
  s.name           = 'IwNetwork'
  s.version        = '1.0.0'
  s.summary        = 'HTTPS requests that can accept a self-signed certificate, and SMTP mail'
  s.description    = 'Used for BioCore servers on a local network that present a self-signed certificate, and for sending transactions to NRTIO by e-mail.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.license        = { :type => "MIT" }

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
