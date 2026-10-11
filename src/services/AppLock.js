import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { isValidPin, lockoutMs } from '../utils/pinLock';

const CONFIG_KEY = 'appLockConfig';
const PIN_KEY = 'appLockPin';
const FAILURES_KEY = 'appLockFailures';

export const isLockSupported = Platform.OS !== 'web';

const readJson = async (key, fallback) => {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const getLockConfig = async () => {
  if (!isLockSupported) return { enabled: false, biometrics: false };
  const config = await readJson(CONFIG_KEY, {});
  return { enabled: config.enabled === true, biometrics: config.biometrics === true };
};

export const enableLock = async (pin, biometrics) => {
  if (!isValidPin(pin)) throw new Error('invalid pin');
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify({ enabled: true, biometrics: Boolean(biometrics) }));
  await SecureStore.deleteItemAsync(FAILURES_KEY);
};

export const setBiometrics = async (biometrics) => {
  const config = await getLockConfig();
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify({ ...config, biometrics: Boolean(biometrics) }));
};

export const disableLock = async () => {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(CONFIG_KEY);
  await SecureStore.deleteItemAsync(FAILURES_KEY);
};

export const getLockout = async () => {
  const { failures = 0, at = 0 } = await readJson(FAILURES_KEY, {});
  return { failures, until: at + lockoutMs(failures) };
};

export const verifyPin = async (pin) => {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (stored !== null && stored === pin) {
    await SecureStore.deleteItemAsync(FAILURES_KEY);
    return { ok: true, until: 0 };
  }
  const { failures } = await getLockout();
  const next = failures + 1;
  const at = Date.now();
  await SecureStore.setItemAsync(FAILURES_KEY, JSON.stringify({ failures: next, at }));
  return { ok: false, until: at + lockoutMs(next) };
};

export const resetFailures = () => SecureStore.deleteItemAsync(FAILURES_KEY);

export const biometricsAvailable = async () => {
  if (!isLockSupported) return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
};

export const authenticateBiometric = async (promptMessage = 'Desbloquear Zeno Cash') => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Usar PIN',
      disableDeviceFallback: true
    });
    return result.success === true;
  } catch {
    return false;
  }
};
