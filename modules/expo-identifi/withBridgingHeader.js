const { withXcodeProject } = require("@expo/config-plugins");

function withBridgingHeader(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    // Update this path to point to your bridging header file relative to the Xcode project root.
    // For example, if your bridging header is located at ios/ExpoIdentifi-Bridging-Header.h, use:
    const bridgingHeaderPath =
      '"$(PODS_ROOT)/Headers/Public/ExpoIdentifi/ExpoIdentifi-Bridging-Header.h"';

    // Loop over all build configurations in the Xcode project and set the SWIFT_OBJC_BRIDGING_HEADER property
    const buildConfigurations = project.pbxXCBuildConfigurationSection();
    for (const key in buildConfigurations) {
      if (
        typeof buildConfigurations[key] === "object" &&
        buildConfigurations[key].buildSettings
      ) {
        buildConfigurations[key].buildSettings["SWIFT_OBJC_BRIDGING_HEADER"] =
          bridgingHeaderPath;
      }
    }
    return config;
  });
}

module.exports = withBridgingHeader;
