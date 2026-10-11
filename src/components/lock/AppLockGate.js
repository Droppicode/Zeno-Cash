import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../../context/SettingsContext';
import { authenticateBiometric, getLockConfig, getLockout, isLockSupported, verifyPin } from '../../services/AppLock';
import { shouldRelock } from '../../utils/pinLock';
import PinPad from './PinPad';

export default function AppLockGate({ children }) {
  const { activeTheme } = useContext(SettingsContext);
  const [checked, setChecked] = useState(!isLockSupported);
  const [locked, setLocked] = useState(false);
  const [config, setConfig] = useState({ enabled: false, biometrics: false });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const backgroundedAt = useRef(null);
  const prompting = useRef(false);

  const tryBiometric = useCallback(async (cfg) => {
    if (!cfg.biometrics || prompting.current) return;
    prompting.current = true;
    const ok = await authenticateBiometric();
    prompting.current = false;
    if (ok) {
      setLocked(false);
      setPin('');
      setError('');
    }
  }, []);

  const lockNow = useCallback(async () => {
    const cfg = await getLockConfig();
    setConfig(cfg);
    setChecked(true);
    if (!cfg.enabled) {
      setLocked(false);
      return;
    }
    setLocked(true);
    setPin('');
    setUntil((await getLockout()).until);
    tryBiometric(cfg);
  }, [tryBiometric]);

  useEffect(() => {
    if (isLockSupported) lockNow();
  }, [lockNow]);

  useEffect(() => {
    if (!isLockSupported) return undefined;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        if (backgroundedAt.current === null && !prompting.current) backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;
      const away = backgroundedAt.current;
      backgroundedAt.current = null;
      const cfg = await getLockConfig();
      if (shouldRelock({ enabled: cfg.enabled, backgroundedAt: away })) lockNow();
    });
    return () => sub.remove();
  }, [lockNow]);

  useEffect(() => {
    if (until <= now) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until, now]);

  const submit = async () => {
    const result = await verifyPin(pin);
    setPin('');
    if (result.ok) {
      setLocked(false);
      setError('');
      return;
    }
    setError('PIN incorreto');
    setUntil(result.until);
    setNow(Date.now());
  };

  const waitSeconds = Math.ceil((until - now) / 1000);
  const blocked = waitSeconds > 0;

  if (!checked) return null;

  return (
    <>
      {children}
      <Modal visible={locked} animationType="none" onRequestClose={() => {}} statusBarTranslucent>
        <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
          <Ionicons name="lock-closed" size={40} color={activeTheme.accent} />
          <Text style={[styles.title, { color: activeTheme.text, fontFamily: activeTheme.fontFamily || 'monospace' }]}>Zeno Cash bloqueado</Text>
          <Text style={[styles.subtitle, { color: blocked || error ? activeTheme.expense : activeTheme.textSecondary }]}>
            {blocked ? `Muitas tentativas. Tente de novo em ${waitSeconds}s.` : error || 'Digite seu PIN'}
          </Text>
          {config.enabled && (
            <PinPad
              value={pin}
              onChange={(v) => { setPin(v); setError(''); }}
              onSubmit={submit}
              theme={activeTheme}
              disabled={blocked}
              onBiometric={config.biometrics ? () => tryBiometric(config) : undefined}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 8, marginBottom: 28 }
});
