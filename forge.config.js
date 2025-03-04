const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      './build/renderer'
    ],
    osxSign: {
      identity: 'Developer ID Application: Bubble Social, LLC (AT35K6L2KT)', // Use your local development certificate
      'hardened-runtime': false, // Disable hardened runtime
      'gatekeeper-assess': false, // Bypass Gatekeeper assessment
      'signature-flags': 'library', // Required for Electron apps
      optionsForFile: (filePath) => {
        return {
          entitlements: './entitlements.plist'
        };
      }
    },
    osxNotarize: false,
    updateURL: 'https://scratchpad-releases.s3-website-us-east-1.amazonaws.com/scratchpad/darwin',
    publishAutoUpdate: true,
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: (arch) => ({
        macUpdateManifestBaseUrl: `https://scratchpad-releases.s3.us-east-1.amazonaws.com/scratchpad/darwin/${arch}`
      })
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {},
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-s3',
      config: {
        bucket: 'scratchpad-releases',
        public: true,
        region: "us-east-1" // Set your desired AWS region here
      }
    },
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'laneshetron',
          name: 'scratchpad'
        },
        prerelease: false
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
