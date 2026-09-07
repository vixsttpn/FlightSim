import { CapacitorConfig } from '@capacitor/cli';

// Конфигурация Capacitor для FlightSim
// appId должен быть уникальным, appName - отображаемое имя
const config: CapacitorConfig = {
  appId: 'com.flightsim.app',
  appName: 'FlightSim',
  webDir: 'dist',
  server: {
    // Для разработки можно включить live reload
    // androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK'
    },
    Keyboard: {
      resize: 'native'
    }
  },
  android: {
    // Конфиг для Android сборки
    backgroundColor: '#cc00cc' // фирменный пурпурный из логотипа
  },
  ios: {
    // Конфиг для iOS
    contentInset: 'always',
    backgroundColor: '#cc00cc'
  }
};

export default config;
