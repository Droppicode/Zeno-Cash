import React, { useState, useContext, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';

import ThemeConfigScreen from './ThemeConfigScreen';
import ModuleConfigScreen from './ModuleConfigScreen';
import AccountsConfigScreen from './AccountsConfigScreen';
import CategoriesConfigScreen from './CategoriesConfigScreen';
import AutomationsConfigScreen from './AutomationsConfigScreen';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';

export default function SettingsScreen({ navigation }) {
  const { activeTheme, defaultPeriod, llmKey, saveSetting } = useContext(SettingsContext);
  
  const [currentScreen, setCurrentScreen] = useState('hub'); // 'hub', 'theme', 'module', 'accounts', 'categories', 'automations'
  const [llmKeyLocal, setLlmKeyLocal] = useState(llmKey || '');

  useEffect(() => {
    const backAction = () => {
      if (currentScreen !== 'hub') {
        setCurrentScreen('hub');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen]);

  const handleBackup = () => {
    Alert.alert('Backup Local', 'Funcionalidade de backup será integrada com Google Drive na Fase 4.');
  };

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  if (currentScreen === 'theme') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <ThemeConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'module') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <ModuleConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'accounts') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <AccountsConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'categories') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <CategoriesConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'automations') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <AutomationsConfigScreen onBack={() => setCurrentScreen('hub')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.card }]}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary, backgroundColor: activeTheme.card }]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.title, { color: activeTheme.text }]}>Configurações Globais</Text>
        <View style={{ width: 40 }} />
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

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('categories')}>
            <Ionicons name="pricetags" size={32} color={activeTheme.accent} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Categorias</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Regras e cores</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('module')}>
            <Ionicons name="construct" size={32} color={activeTheme.accent} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Módulos</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Funções do app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('automations')}>
            <Ionicons name="flash" size={32} color={activeTheme.income} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Automações</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Pix e Notificações</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => navigation.navigate('Debts')}>
            <Ionicons name="people" size={32} color={activeTheme.expense} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Dívidas</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Quem me deve</Text>
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

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    menuGrid: { flexDirection: 'row', gap: 12 * z, marginBottom: 20 * z },
    menuCard: { flex: 1, padding: 16 * z, borderRadius: 16 * z, alignItems: 'flex-start' },
    menuTitle: { fontSize: 16 * z, fontWeight: 'bold', marginTop: 12 * z, marginBottom: 4 * z, fontFamily: f },
    menuDesc: { fontSize: 12 * z, fontFamily: f },

    section: { borderRadius: 16 * z, padding: 20 * z, marginBottom: 20 * z },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    sectionDesc: { fontSize: 14 * z, marginTop: 4 * z, marginBottom: 16 * z, fontFamily: f },
    
    chip: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 20 * z },
    chipText: { fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
    
    backupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 16 * z, borderRadius: 12 * z, marginTop: 8 * z },
    backupText: { fontWeight: 'bold', fontSize: 16 * z, fontFamily: f }
  });
};
