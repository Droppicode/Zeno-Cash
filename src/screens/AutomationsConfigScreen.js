import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { SettingsContext } from '../context/SettingsContext';
import { getZoomFactor } from '../utils/scaler';

export default function AutomationsConfigScreen({ onBack }) {
  const { activeTheme } = useContext(SettingsContext);
  const [hasPermission, setHasPermission] = useState(false);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

  const checkPermission = async () => {
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      setHasPermission(status !== 'denied');
    } catch (error) {
      console.log('Error checking notification permission', error);
    }
  };

  useEffect(() => {
    checkPermission();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermission();
      }
    });
    return () => subscription.remove();
  }, []);

  const togglePermission = () => {
    if (hasPermission) {
      Alert.alert(
        'Desativar Permissão',
        'Para desativar a leitura automática, você precisa revogar a permissão nas Configurações do Android. Deseja abrir as configurações?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configurações', onPress: () => RNAndroidNotificationListener.requestPermission() }
        ]
      );
    } else {
      Alert.alert(
        'Ativar Automação',
        'Ao ativar, o Zeno Cash irá interceptar notificações de bancos (ex: Pix recebido) e cadastrar transações pendentes automaticamente. Você será redirecionado para permitir o Acesso a Notificações.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => RNAndroidNotificationListener.requestPermission() }
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { backgroundColor: activeTheme.card, borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Automações</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '20' }]}>
              <Ionicons name="notifications" size={24} color={activeTheme.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cardTitle, { color: activeTheme.text }]}>Leitor de Notificações</Text>
              <Text style={[styles.cardDesc, { color: activeTheme.textSecondary }]}>Captura automática de transações via notificações de bancos (Pix e Cartões).</Text>
            </View>
            <Switch
              value={hasPermission}
              onValueChange={togglePermission}
              thumbColor={hasPermission ? activeTheme.accent : '#f4f3f4'}
              trackColor={{ false: '#767577', true: activeTheme.accent + '80' }}
            />
          </View>
          {hasPermission && (
            <View style={[styles.statusBox, { backgroundColor: activeTheme.income + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={activeTheme.income} />
              <Text style={[styles.statusText, { color: activeTheme.income }]}>Serviço ativo e escutando notificações</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const getStyles = (z, f) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16 * z,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8 * z,
    marginLeft: -8 * z,
  },
  title: {
    fontFamily: f,
    fontSize: 20 * z,
    fontWeight: 'bold',
  },
  content: {
    padding: 16 * z,
  },
  card: {
    borderRadius: 16 * z,
    padding: 16 * z,
    marginBottom: 16 * z,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48 * z,
    height: 48 * z,
    borderRadius: 24 * z,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: f,
    fontSize: 16 * z,
    fontWeight: 'bold',
    marginBottom: 4 * z,
  },
  cardDesc: {
    fontFamily: f,
    fontSize: 12 * z,
    lineHeight: 18 * z,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16 * z,
    padding: 12 * z,
    borderRadius: 8 * z,
    gap: 8 * z,
  },
  statusText: {
    fontFamily: f,
    fontSize: 12 * z,
    fontWeight: '500',
  }
});
