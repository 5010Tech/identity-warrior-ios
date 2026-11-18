const path = require('path');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: false,
    },
  },
  dependencies: {
    'react-native-slapshot-capture-library': {
      root: path.resolve(__dirname, 'modules/slapshot-capture-library'),
    },
  },
};