import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cashnowpartner.app",
  appName: "Cashnow-Partner",
  webDir: "dist",
  server: {
    androidScheme: "http",
  },
};

export default config;
