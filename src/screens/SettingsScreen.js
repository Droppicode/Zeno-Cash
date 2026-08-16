import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';

const THEME_COLORS = ['#BB86FC', '#03DAC6', '#CF6679', '#F44336', '#4CAF50', '#2196F3', '#FF9800'];

export default function SettingsScreen() {
  const { accentColor, defaultPeriod, llmKey, uiConfig, saveSetting } = useContext(SettingsContext);
  const [llmKeyLocal, setLlmKeyLocal] = useState(llmKey || '');

  useEffect(() => {
    setLlmKeyLocal(llmKey || '');
  }, [llmKey]);

  const handleToggleUi = (key) => {
    const newConfig = { ...uiConfig, [key]: !uiConfig[key] };
    saveSetting('uiConfig', newConfig);
  };

  const handleBackup = () => {
    Alert.alert('Backup Local', 'Funcionalidade de backup será integrada com Google Drive na Fase 4.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações Globais</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Seção Temas e Cores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aparência (Tema)</Text>
          <Text style={styles.sectionDesc}>Escolha a cor de destaque do aplicativo.</Text>
          <View style={styles.colorPaletteRow}>
            {THEME_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  accentColor === color && styles.colorCircleActive
                ]}
                onPress={() => {
                  saveSetting('accentColor', color);
                }}
              >
                {accentColor === color && <Ionicons name="checkmark" size={20} color="#121212" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modularidade de Tela */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modularidade de Interface</Text>
          <Text style={styles.sectionDesc}>Ligue ou desligue módulos das telas.</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>[Home] Mostrar Pendências</Text>
            <Switch
              value={uiConfig.homeShowPending}
              onValueChange={() => handleToggleUi('homeShowPending')}
              trackColor={{ false: '#333', true: accentColor }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>[Home] Mostrar Contas/Bancos</Text>
            <Switch
              value={uiConfig.homeShowAccounts}
              onValueChange={() => handleToggleUi('homeShowAccounts')}
              trackColor={{ false: '#333', true: accentColor }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>[Análise] Top 3 Vilões</Text>
            <Switch
              value={uiConfig.analyticsShowVilao}
              onValueChange={() => handleToggleUi('analyticsShowVilao')}
              trackColor={{ false: '#333', true: accentColor }}
            />
          </View>
        </View>

        {/* Comportamento Padrão */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comportamento Padrão</Text>
          <Text style={styles.sectionDesc}>Período padrão ao abrir o app.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {['30d', '90d', 'all'].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, defaultPeriod === p && { backgroundColor: accentColor }]}
                onPress={() => {
                  saveSetting('defaultPeriod', p);
                }}
              >
                <Text style={[styles.chipText, defaultPeriod === p && { color: '#121212' }]}>
                  {p === '30d' ? '30 Dias' : p === '90d' ? '90 Dias' : 'Sempre'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Integrações LLM (Futuro) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integração LLM (Beta)</Text>
          <Text style={styles.sectionDesc}>Cole sua chave da OpenAI para habilitar a leitura de extratos em PDF no futuro.</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-proj-..."
            placeholderTextColor="#888"
            secureTextEntry
            value={llmKeyLocal}
            onChangeText={setLlmKeyLocal}
            onBlur={() => saveSetting('llmKey', llmKeyLocal)}
          />
        </View>

        {/* Backup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança e Backup</Text>
          <Text style={styles.sectionDesc}>Gere cópias de segurança do seu banco SQLite.</Text>
          <TouchableOpacity style={[styles.backupBtn, { borderColor: accentColor }]} onPress={handleBackup}>
            <Ionicons name="cloud-download-outline" size={20} color={accentColor} style={{ marginRight: 8 }} />
            <Text style={[styles.backupText, { color: accentColor }]}>Exportar Banco de Dados</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 16, backgroundColor: '#1E1E1E', borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  scroll: { padding: 16 },
  
  section: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionDesc: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 16 },
  
  colorPaletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  colorCircleActive: { borderWidth: 2, borderColor: '#fff' },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  switchLabel: { color: '#fff', fontSize: 16 },
  
  chip: { backgroundColor: '#2C2C2C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipText: { color: '#888', fontWeight: 'bold' },
  
  input: { backgroundColor: '#2C2C2C', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16 },
  
  backupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 16, borderRadius: 12, marginTop: 8 },
  backupText: { fontWeight: 'bold', fontSize: 16 }
});
