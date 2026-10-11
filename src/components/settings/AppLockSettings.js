import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import {
  authenticateBiometric, biometricsAvailable, disableLock, enableLock, getLockConfig, resetFailures, setBiometrics, verifyPin
} from '../../services/AppLock';
import PinPad from '../lock/PinPad';

const PROMPTS = {
  verify: 'Digite o PIN atual',
  new: 'Crie um PIN de 4 a 6 dígitos',
  confirm: 'Repita o novo PIN'
};

export default function AppLockSettings({ theme, styles }) {
  const [config, setConfig] = useState({ enabled: false, biometrics: false });
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [flow, setFlow] = useState(null);
  const [step, setStep] = useState('new');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setConfig(await getLockConfig());
    setHasBiometrics(await biometricsAvailable());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const start = (purpose) => {
    setFlow(purpose);
    setStep(purpose === 'enable' ? 'new' : 'verify');
    setPin('');
    setFirstPin('');
    setError('');
  };

  const close = () => setFlow(null);

  const submit = async () => {
    const value = pin;
    setPin('');
    if (step === 'verify') {
      const result = await verifyPin(value);
      if (!result.ok) {
        setError(result.until > Date.now() ? 'PIN incorreto. Muitas tentativas, tente mais tarde.' : 'PIN incorreto');
        return;
      }
      if (flow === 'disable') {
        await disableLock();
        close();
        reload();
        return;
      }
      setStep('new');
      setError('');
      return;
    }
    if (step === 'new') {
      setFirstPin(value);
      setStep('confirm');
      setError('');
      return;
    }
    if (value !== firstPin) {
      setStep('new');
      setError('Os PINs não conferem. Tente de novo.');
      return;
    }
    await enableLock(value, config.biometrics);
    await resetFailures();
    close();
    reload();
    if (flow === 'enable') Alert.alert('Bloqueio ativado', 'O app vai pedir o PIN ao abrir e depois de 30s em segundo plano.');
  };

  const toggleBiometrics = async (value) => {
    if (value && !(await authenticateBiometric('Confirme sua biometria'))) return;
    await setBiometrics(value);
    reload();
  };

  const f = theme.fontFamily || 'monospace';

  return (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Bloqueio do App</Text>
      <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>Peça PIN ou biometria ao abrir o app e ao voltar depois de 30s.</Text>

      <View style={local.row}>
        <Text style={[local.label, { color: theme.text, fontFamily: f }]}>Bloquear com PIN</Text>
        <Switch
          value={config.enabled}
          onValueChange={value => start(value ? 'enable' : 'disable')}
          trackColor={{ false: '#333', true: theme.accent }}
        />
      </View>

      {config.enabled && hasBiometrics && (
        <View style={local.row}>
          <Text style={[local.label, { color: theme.text, fontFamily: f }]}>Desbloquear com biometria</Text>
          <Switch value={config.biometrics} onValueChange={toggleBiometrics} trackColor={{ false: '#333', true: theme.accent }} />
        </View>
      )}

      {config.enabled && (
        <TouchableOpacity onPress={() => start('change')} style={{ marginTop: 8 }}>
          <Text style={{ color: theme.accent, fontWeight: 'bold', fontFamily: f }}>Alterar PIN</Text>
        </TouchableOpacity>
      )}

      <Modal visible={flow !== null} animationType="slide" onRequestClose={close}>
        <View style={[local.modal, { backgroundColor: theme.background }]}>
          <Text style={[local.prompt, { color: theme.text, fontFamily: f }]}>{PROMPTS[step]}</Text>
          <Text style={[local.error, { color: theme.expense, fontFamily: f }]}>{error}</Text>
          <PinPad value={pin} onChange={v => { setPin(v); setError(''); }} onSubmit={submit} theme={theme} />
          <TouchableOpacity onPress={close} style={{ marginTop: 20 }}>
            <Text style={{ color: theme.textSecondary, fontFamily: f }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 14, flex: 1 },
  modal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  prompt: { fontSize: 18, fontWeight: 'bold' },
  error: { fontSize: 13, marginTop: 8, marginBottom: 24, minHeight: 18 }
});
