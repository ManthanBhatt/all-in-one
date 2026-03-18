import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manthan.freelanceros',
  appName: 'Freelancer OS',
  webDir: 'www',
  plugins: {
    LocalNotifications: {
      iconColor: '#FF7A59',
    },
  },
};

export default config;
