import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manthan.freelanceros',
  appName: 'Essentials',
  webDir: 'www',
  plugins: {
    LocalNotifications: {
      iconColor: '#ffffff',
    },
  },
};

export default config;
