import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cashnow.app",
  appName: "Cashnow",
  webDir: "dist",
  server: {
    androidScheme: "http",
  },
};

export default config;
