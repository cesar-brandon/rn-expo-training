import { ConfigContext, ExpoConfig } from 'expo/config';

export const IS_DEV = process.env.APP_VARIANT === "development";
export const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return "com.cesarbrandon.rnexpotraining.dev";
  }

  if (IS_PREVIEW) {
    return "com.cesarbrandon.rnexpotraining.preview";
  }

  return "com.cesarbrandon.rnexpotraining";
};

const getAppName = () => {
  if (IS_DEV) {
    return "rn-expo-training (Dev)";
  }

  if (IS_PREVIEW) {
    return "rn-expo-training (Preview)";
  }

  return "rn-expo-training App";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "rn-expo-training",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "rnexpotraining",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  jsEngine: "hermes", 
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
    jsEngine: "jsc", 
  },
  android: {
    adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: getUniqueIdentifier(),
    },
    web: {
      bundler: "metro",
      output: "server",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-maps",
        {
          requestLocationPermission: true,
        },
      ],
      [
        "expo-sqlite",
        {
          "enableFTS": true,
          "useSQLCipher": true,
          "android": {
            // Override the shared configuration for Android
            "enableFTS": false,
            "useSQLCipher": false
          },
          "ios": {
            // You can also override the shared configurations for iOS
            "customBuildFlags": ["-DSQLITE_ENABLE_DBSTAT_VTAB=1 -DSQLITE_ENABLE_SNAPSHOT=1"]
          }
        }
      ],
      "expo-video"
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: process.env.NODE_ENV === 'development' 
          ? "http://localhost:8081" 
          : "https://your-production-domain.com"
      },
      eas: {
        projectId: "bc555c18-e09f-457f-a1ab-041755d9b54a",
      },
    },
});
