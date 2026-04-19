import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { DataProvider } from '@/contexts/data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <DataProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
              <Stack.Screen
                name="treatment-form"
                options={{ presentation: 'modal', title: 'Лечение' }}
              />
              <Stack.Screen
                name="journal-form"
                options={{ presentation: 'modal', title: 'Запись' }}
              />
              <Stack.Screen
                name="photo-detail"
                options={{ presentation: 'modal', title: 'Фото' }}
              />
              <Stack.Screen
                name="article-detail"
                options={{ title: 'Статья' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </DataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
