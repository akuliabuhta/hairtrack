/**
 * Cross-platform replacement for `Alert.alert`.
 *
 * `react-native-web`'s Alert is a no-op (literally `static alert() {}`),
 * so every `Alert.alert(...)` call on web silently does nothing. This
 * wrapper routes to the platform-appropriate dialog:
 *
 *  - native: use RN's Alert.alert (full button support)
 *  - web:    use window.confirm for multi-button, window.alert otherwise
 *
 * Signature mirrors `Alert.alert` so usages are a drop-in rename.
 */

import { Alert, Platform } from 'react-native';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/** Mirrors the native `AlertOptions` shape so existing call-sites keep compiling. */
export type AlertOptions = { cancelable?: boolean; onDismiss?: () => void };

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons, options);
    return;
  }

  // Web path
  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Multi-button: surface as confirm, mapping:
  //   destructive / primary → OK branch (highest-importance action)
  //   cancel                → Cancel branch
  const cancel = buttons.find((b) => b.style === 'cancel');
  const primary =
    buttons.find((b) => b.style === 'destructive') ??
    buttons.find((b) => b.style !== 'cancel') ??
    buttons[0];

  const ok = window.confirm(text);
  if (ok) primary?.onPress?.();
  else cancel?.onPress?.();
}
