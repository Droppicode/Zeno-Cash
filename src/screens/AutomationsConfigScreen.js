import React, { useContext, useEffect, useState, useMemo } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, AppState, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { SettingsContext } from '../context/SettingsContext';
import { db } from '../database/db';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import { loadReminderConfig, rescheduleReminders } from '../services/ReminderScheduler';
import { DEFAULT_REMINDER_CONFIG } from '../utils/Reminders';

export default function AutomationsConfigScreen({ onBack }) {
  const { activeTheme, saveSetting, llmKey } = useContext(SettingsContext);
  const [hasPermission, setHasPermission] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [reminders, setReminders] = useState(DEFAULT_REMINDER_CONFIG);

  useEffect(() => {
    loadReminderConfig().then(setReminders).catch(() => {});
  }, []);

  const updateReminders = async (patch) => {
    const next = { ...reminders, ...patch };
    setReminders(next);
    await saveSetting('reminderConfig', next);
    rescheduleReminders();
  };

  useEffect(() => {
    db.select().from(settings).where(eq(settings.key, 'notificationAi'))
      .then(rows => setAiEnabled(rows[0]?.value !== 'false'))
      .catch(() => {});
  }, []);

  const toggleAi = (value) => {
    setAiEnabled(value);
    saveSetting('notificationAi', value ? 'true' : 'false');
  };

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

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
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Automações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

        <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '20' }]}>
              <Ionicons name="sparkles" size={24} color={activeTheme.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cardTitle, { color: activeTheme.text }]}>Sugestões com IA</Text>
              <Text style={[styles.cardDesc, { color: activeTheme.textSecondary }]}>Envia o texto das notificações de banco ao provedor do Assistente, usando o modelo mais rápido dele, para sugerir título, nota e categoria no seu estilo, aprendendo com as pendências que você aprova.</Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={toggleAi}
              thumbColor={aiEnabled ? activeTheme.accent : '#f4f3f4'}
              trackColor={{ false: '#767577', true: activeTheme.accent + '80' }}
            />
          </View>
          {aiEnabled && !llmKey && (
            <View style={[styles.statusBox, { backgroundColor: activeTheme.expense + '20' }]}>
              <Ionicons name="key-outline" size={16} color={activeTheme.expense} />
              <Text style={[styles.statusText, { color: activeTheme.expense, flex: 1 }]}>Adicione uma chave em Config → Assistente IA para ativar.</Text>
            </View>
          )}
        </View>

        {Platform.OS !== 'web' && (
        <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '20' }]}>
              <Ionicons name="alarm" size={24} color={activeTheme.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cardTitle, { color: activeTheme.text }]}>Lembretes</Text>
              <Text style={[styles.cardDesc, { color: activeTheme.textSecondary }]}>Avisos às {reminders.hour}h sobre faturas perto do vencimento, recorrências do dia e dívidas paradas.</Text>
            </View>
            <Switch
              value={reminders.enabled}
              onValueChange={value => updateReminders({ enabled: value })}
              thumbColor={reminders.enabled ? activeTheme.accent : '#f4f3f4'}
              trackColor={{ false: '#767577', true: activeTheme.accent + '80' }}
            />
          </View>
          {reminders.enabled && (
            <View style={{ marginTop: 12 }}>
              {[
                { key: 'invoices', label: 'Vencimento da fatura', optionKey: 'invoiceDaysBefore', options: [1, 3, 5], suffix: 'd antes' },
                { key: 'recurrences', label: 'Recorrências do dia' },
                { key: 'debts', label: 'Dívidas paradas', optionKey: 'staleDebtDays', options: [15, 30, 60], suffix: ' dias' }
              ].map(item => (
                <View key={item.key} style={styles.reminderRow}>
                  <View style={styles.reminderHeader}>
                    <Text style={[styles.reminderLabel, { color: activeTheme.text }]}>{item.label}</Text>
                    <Switch
                      value={reminders[item.key]}
                      onValueChange={value => updateReminders({ [item.key]: value })}
                      thumbColor={reminders[item.key] ? activeTheme.accent : '#f4f3f4'}
                      trackColor={{ false: '#767577', true: activeTheme.accent + '80' }}
                    />
                  </View>
                  {item.optionKey && reminders[item.key] && (
                    <View style={styles.chipRow}>
                      {item.options.map(option => {
                        const selected = reminders[item.optionKey] === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            onPress={() => updateReminders({ [item.optionKey]: option })}
                            style={[styles.chip, { backgroundColor: selected ? activeTheme.accent : activeTheme.cardSecondary }]}
                          >
                            <Text style={[styles.chipText, { color: selected ? activeTheme.background : activeTheme.text }]}>{option}{item.suffix}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
        )}
      </ScrollView>
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    content: { padding: 16 * z },
    card: { borderRadius: 6 * z, padding: 16 * z, marginBottom: 16 * z },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48 * z, height: 48 * z, borderRadius: 8 * z, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontFamily: f, fontSize: 16 * z, fontWeight: 'bold', marginBottom: 4 * z },
    cardDesc: { fontFamily: f, fontSize: 12 * z, lineHeight: 18 * z },
    statusBox: { flexDirection: 'row', alignItems: 'center', marginTop: 16 * z, padding: 12 * z, borderRadius: 4 * z, gap: 8 * z },
    statusText: { fontFamily: f, fontSize: 12 * z, fontWeight: '500' },
    reminderRow: { paddingVertical: 8 * z },
    reminderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reminderLabel: { fontFamily: f, fontSize: 14 * z },
    chipRow: { flexDirection: 'row', gap: 8 * z, marginTop: 6 * z },
    chip: { paddingHorizontal: 12 * z, paddingVertical: 6 * z, borderRadius: 4 * z },
    chipText: { fontFamily: f, fontSize: 12 * z, fontWeight: '600' }
  });
};
