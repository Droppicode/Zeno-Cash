module.exports = ({ config }) => {
  // Read an environment variable to determine if it's dev or prod
  const isProd = process.env.APP_ENV === 'production';
  
  // Set the package name depending on the environment
  const packageName = isProd ? 'com.mmn.zenocash' : 'com.mmn.zenocash.dev';
  
  // Set the app name to differentiate it on the device screen
  const appName = isProd ? 'Zeno Cash' : 'Zeno Cash (Dev)';
  
  // Define which icon to use
  // NOTE: Expo strongly recommends using .png files for icons.
  const appIcon = isProd ? './assets/icon.png' : './assets/icon-dev.png';

  return {
    ...config,
    name: appName,
    icon: appIcon,
    ios: {
      ...config.ios,
      bundleIdentifier: packageName,
    },
    android: {
      ...config.android,
      package: packageName,
    },
  };
};
