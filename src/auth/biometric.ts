import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export const BIOMETRIC_ENABLED_KEY = 'investory.biometricLoginEnabled';

export async function biometricLoginAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync()
  ]);
  return hardware && enrolled;
}

export async function authenticateForBiometricLogin(): Promise<boolean> {
  if (!(await biometricLoginAvailable())) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Investory Accounting',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false
  });
  return result.success;
}
