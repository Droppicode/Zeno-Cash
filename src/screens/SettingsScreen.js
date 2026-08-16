import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';

import ThemeConfigScreen from './ThemeConfigScreen';
import ModuleConfigScreen from './ModuleConfigScreen';
import AccountsConfigScreen from './AccountsConfigScreen';

export default function SettingsScreen() {
  const { activeTheme, defaultPeriod, llmKey, saveSetting } = useContext(SettingsContext);
  
  const [currentScreen, setCurrentScreen] = useState('hub'); // 'hub', 'theme', 'module', 'accounts'
  const [llmKeyLocal, setLlmKeyLocal] = useState(llmKey || '');

  const handleBackup = () => {
    Alert.alert('Backup Local', 'Funcionalidade de backup será integrada com Google Drive na Fase 4.');
  };

  const z = 0.8 * (activeTheme.zoom || 1);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

  if (currentScreen === 'theme') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]} edges={['top']}>
        <ThemeConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'module') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]} edges={['top']}>
        <ModuleConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'accounts') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]} edges={['top']}>
        <AccountsConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.card }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary, backgroundColor: activeTheme.card }]}>
        <Text style={[styles.title, { color: activeTheme.text }]}>Configurações Globais</Text>
      </View>

      <View style={{ flex: 1, backgroundColor: activeTheme.background }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.menuGrid}>
          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('theme')}>
            <Ionicons name="color-palette" size={32} color={activeTheme.accent} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Temas</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Cores e visual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('accounts')}>
            <Ionicons name="wallet" size={32} color={activeTheme.accent} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Contas</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Saldos e bancos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('module')}>
            <Ionicons name="construct" size={32} color={activeTheme.accent} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Módulos</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Funções do app</Text>
          </TouchableOpacity>
        </View>

        {/* Comportamento Padrão */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Comportamento Padrão</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Período padrão ao abrir o app.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {['30d', '90d', 'all'].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, { backgroundColor: activeTheme.cardSecondary }, defaultPeriod === p && { backgroundColor: activeTheme.accent }]}
                onPress={() => {
                  saveSetting('defaultPeriod', p);
                }}
              >
                <Text style={[styles.chipText, { color: activeTheme.textSecondary }, defaultPeriod === p && { color: '#121212' }]}>
                  {p === '30d' ? '30 Dias' : p === '90d' ? '90 Dias' : 'Sempre'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Integrações LLM (Futuro) */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Integração LLM (Beta)</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Cole sua chave da OpenAI para habilitar a leitura de extratos em PDF no futuro.</Text>
          <TextInput
            style={[styles.input, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
            placeholder="sk-proj-..."
            placeholderTextColor={activeTheme.textSecondary}
            secureTextEntry
            value={llmKeyLocal}
            onChangeText={setLlmKeyLocal}
            onBlur={() => saveSetting('llmKey', llmKeyLocal)}
          />
        </View>

        {/* Backup */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Segurança e Backup</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Gere cópias de segurança do seu banco SQLite.</Text>
          <TouchableOpacity style={[styles.backupBtn, { borderColor: activeTheme.accent }]} onPress={handleBackup}>
            <Ionicons name="cloud-download-outline" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.backupText, { color: activeTheme.accent }]}>Exportar Banco de Dados</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (z, f) => StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 * z, borderBottomWidth: 1 },
  title: { fontSize: 24 * z, fontWeight: 'bold', marginTop: 16 * z, fontFamily: f },
  scroll: { padding: 16 * z },
  
  menuGrid: { flexDirection: 'row', gap: 12 * z, marginBottom: 20 * z },
  menuCard: { flex: 1, padding: 16 * z, borderRadius: 16 * z, alignItems: 'flex-start' },
  menuTitle: { fontSize: 16 * z, fontWeight: 'bold', marginTop: 12 * z, marginBottom: 4 * z, fontFamily: f },
  menuDesc: { fontSize: 12 * z, fontFamily: f },

  section: { borderRadius: 16 * z, padding: 20 * z, marginBottom: 20 * z },
  sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
  sectionDesc: { fontSize: 14 * z, marginTop: 4 * z, marginBottom: 16 * z, fontFamily: f },
  
  chip: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 20 * z },
  chipText: { fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
  
  input: { padding: 16 * z, borderRadius: 12 * z, fontSize: 16 * z, fontFamily: f },
  
  backupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 16 * z, borderRadius: 12 * z, marginTop: 8 * z },
  backupText: { fontWeight: 'bold', fontSize: 16 * z, fontFamily: f }
});
