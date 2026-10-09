const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // package.json "main" omits the file extension, which eslint-plugin-import cannot resolve
      'import/no-unresolved': ['error', { ignore: ['^react-native-sortables$'] }]
    }
  },
  {
    ignores: [
      'website/**',
      'android/**',
      'dist/**',
      'node_modules/**',
      '.agents/**'
    ]
  }
]);
