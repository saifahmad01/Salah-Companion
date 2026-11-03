import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.salahcompanion.app',
  appName: 'Salah Companion',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_salah',
      iconColor: '#064E3B',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#064E3B',
    },
  },
}

export default config
