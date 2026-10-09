const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
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
