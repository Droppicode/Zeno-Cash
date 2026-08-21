import React, { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import { useFocusEffect } from '@react-navigation/native';

import ThemeConfigScreen from './ThemeConfigScreen';
import ModuleConfigScreen from './ModuleConfigScreen';
import AccountsConfigScreen from './AccountsConfigScreen';
import CategoriesConfigScreen from './CategoriesConfigScreen';
import AutomationsConfigScreen from './AutomationsConfigScreen';
import ExtractionConfigScreen from './ExtractionConfigScreen';
import { getZoomFactor } from '../utils/scaler';
import { getSharedStyles } from '../utils/StyleHub';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { configureGoogleAuth, uploadDatabaseToDrive, downloadLatestBackup } from '../services/GoogleDriveBackup';
import { DataExportService } from '../services/DataExportService';
import { resetDatabase, seedDatabase } from '../database/seed';

export default function SettingsScreen({ navigation }) {
  const { activeTheme, defaultPeriod, llmKey, backupLimit, backupFrequency, saveSetting } = useContext(SettingsContext);
  
  const [currentScreen, setCurrentScreen] = useState('hub'); // 'hub', 'theme', 'module', 'accounts', 'categories', 'automations', 'extraction'

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (currentScreen !== 'hub') {
          setCurrentScreen('hub');
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [currentScreen])
  );

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleReset = () => {
    Alert.alert(
      'Resetar Aplicativo',
      'ATENÇÃO: Isso apagará todas as suas transações, dívidas, recorrências e contas salvas. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await resetDatabase();
              Alert.alert('Sucesso', 'Aplicativo resetado com sucesso! Reinicie o app para recarregar.');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível resetar os dados.');
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  const handleSeed = () => {
    Alert.alert(
      'Gerar Dados Mock (Seed)',
      'Isso irá resetar o banco e criar uma base completa de testes com bancos, assinaturas, parcelas e divisões.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar Seed',
          onPress: async () => {
            try {
              setIsSeeding(true);
              await seedDatabase(true);
              Alert.alert('Sucesso', 'Base de dados gerada com sucesso! Reinicie o app para visualizar todas as novidades.');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível gerar a base de dados.');
            } finally {
              setIsSeeding(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    configureGoogleAuth();
  }, []);

  const getFriendlyErrorMessage = (error) => {
    const msg = error.message || String(error);
    if (msg.includes('Network request failed')) return 'Verifique sua conexão com a internet e tente novamente.';
    if (msg.includes('DEVELOPER_ERROR')) return 'Erro de configuração do Google (Falta de SHA-1 ou credenciais inválidas).';
    if (msg.includes('PLAY_SERVICES_NOT_AVAILABLE')) return 'Os serviços do Google Play não estão disponíveis no seu celular.';
    if (msg.includes('Insufficient Permission')) return 'Permissão negada pelo Google. Tente fazer o login novamente.';
    if (msg.includes('invalid_grant')) return 'Sua sessão expirou. Por favor, faça login novamente.';
    return msg;
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      await uploadDatabaseToDrive(tokens.accessToken);
      Alert.alert('Sucesso', 'Backup realizado com sucesso no Google Drive!');
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
        console.error(error);
        Alert.alert('Erro', 'Não foi possível realizar o backup:\n\n' + getFriendlyErrorMessage(error));
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restaurar Backup',
      'Isso irá substituir todos os dados atuais do aplicativo pelo backup mais recente do Google Drive. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Restaurar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsRestoring(true);
              await GoogleSignin.hasPlayServices();
              await GoogleSignin.signIn();
              const tokens = await GoogleSignin.getTokens();
              
              await downloadLatestBackup(tokens.accessToken);
              Alert.alert('Sucesso', 'Backup restaurado com sucesso! Reinicie o aplicativo para aplicar as mudanças.');
            } catch (error) {
              if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível restaurar o backup:\n\n' + getFriendlyErrorMessage(error));
              }
            } finally {
              setIsRestoring(false);
            }
          }
        }
      ]
    );
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

  if (currentScreen === 'extraction') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
        <ExtractionConfigScreen onBack={() => setCurrentScreen('hub')} />
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

        <View style={styles.menuGrid}>
          <TouchableOpacity style={[styles.menuCard, { backgroundColor: activeTheme.card }]} onPress={() => setCurrentScreen('extraction')}>
            <Ionicons name="document-text" size={32} color={activeTheme.accent} />
            <Text style={[styles.menuTitle, { color: activeTheme.text }]}>Extratos</Text>
            <Text style={[styles.menuDesc, { color: activeTheme.textSecondary }]}>Leitura Inteligente</Text>
          </TouchableOpacity>
        </View>

        {/* Backup */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Segurança e Backup</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Sincronize seus dados com o Google Drive de forma segura.</Text>
          
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary, marginBottom: 8, marginTop: 8 }]}>Frequência Automática:</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {['daily', 'weekly', 'monthly'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, { backgroundColor: activeTheme.cardSecondary }, backupFrequency === f && { backgroundColor: activeTheme.accent }]}
                onPress={() => saveSetting('backupFrequency', f)}
              >
                <Text style={[styles.chipText, { color: activeTheme.textSecondary }, backupFrequency === f && { color: '#121212' }]}>
                  {f === 'daily' ? 'Diário' : f === 'weekly' ? 'Semanal' : 'Mensal'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary, marginBottom: 8 }]}>Limite de Backups Salvos:</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {['1', '5', '10'].map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, { backgroundColor: activeTheme.cardSecondary }, backupLimit === l && { backgroundColor: activeTheme.accent }]}
                onPress={() => saveSetting('backupLimit', l)}
              >
                <Text style={[styles.chipText, { color: activeTheme.textSecondary }, backupLimit === l && { color: '#121212' }]}>
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.accent, opacity: (isBackingUp || isRestoring) ? 0.5 : 1 }]} 
            onPress={handleBackup}
            disabled={isBackingUp || isRestoring}
          >
            {isBackingUp ? (
                <ActivityIndicator color={activeTheme.accent} size="small" style={{ marginRight: 8 }} />
            ) : (
                <Ionicons name="cloud-upload-outline" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.backupText, { color: activeTheme.accent }]}>
              {isBackingUp ? 'Enviando Backup...' : 'Fazer Backup Agora'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.expense, marginTop: 12, opacity: (isBackingUp || isRestoring) ? 0.5 : 1 }]} 
            onPress={handleRestore}
            disabled={isBackingUp || isRestoring}
          >
            {isRestoring ? (
                <ActivityIndicator color={activeTheme.expense} size="small" style={{ marginRight: 8 }} />
            ) : (
                <Ionicons name="cloud-download-outline" size={20} color={activeTheme.expense} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.backupText, { color: activeTheme.expense }]}>
              {isRestoring ? 'Restaurando...' : 'Restaurar Backup'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Import/Export Local */}
        <View style={[styles.section, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Exportação & Importação Local</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Gerencie seus dados em arquivos JSON (backup) ou CSV (planilhas).</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.accent, flex: 1, marginTop: 0 }]} 
              onPress={() => DataExportService.exportToJSON()}
            >
              <Ionicons name="document-text" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.backupText, { color: activeTheme.accent, fontSize: 14 }]}>Exportar JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.accent, flex: 1, marginTop: 0 }]} 
              onPress={() => DataExportService.exportToCSV()}
            >
              <Ionicons name="stats-chart" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.backupText, { color: activeTheme.accent, fontSize: 14 }]}>Exportar CSV</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.expense, flex: 1, marginTop: 0 }]} 
              onPress={() => {
                Alert.alert(
                  'Importar JSON',
                  'Isso irá adicionar os dados do arquivo ao seu banco atual, não substituindo o que você já tem.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Importar', style: 'destructive', onPress: () => DataExportService.importFromJSON() }
                  ]
                );
              }}
            >
              <Ionicons name="download" size={20} color={activeTheme.expense} style={{ marginRight: 8 }} />
              <Text style={[styles.backupText, { color: activeTheme.expense, fontSize: 14 }]}>Importar JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.expense, flex: 1, marginTop: 0 }]} 
              onPress={() => DataExportService.importFromCSV()}
            >
              <Ionicons name="list" size={20} color={activeTheme.expense} style={{ marginRight: 8 }} />
              <Text style={[styles.backupText, { color: activeTheme.expense, fontSize: 14 }]}>Importar CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Zona de Perigo / Gestão de Dados */}
        <View style={[styles.section, { backgroundColor: activeTheme.card, borderColor: activeTheme.expense + '40', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: activeTheme.expense }]}>Zona de Perigo</Text>
          <Text style={[styles.sectionDesc, { color: activeTheme.textSecondary }]}>Apague todos os dados ou recrie uma base de testes completa.</Text>
          
          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.expense, backgroundColor: activeTheme.expense + '15', marginTop: 0 }]} 
            onPress={handleReset}
            disabled={isResetting || isSeeding}
          >
            {isResetting ? (
              <ActivityIndicator color={activeTheme.expense} size="small" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="trash" size={20} color={activeTheme.expense} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.backupText, { color: activeTheme.expense }]}>
              {isResetting ? 'Excluindo dados...' : 'Excluir Tudo / Resetar App'}
            </Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.accent, backgroundColor: activeTheme.accent + '15', marginTop: 12 }]} 
              onPress={handleSeed}
              disabled={isResetting || isSeeding}
            >
              {isSeeding ? (
                <ActivityIndicator color={activeTheme.accent} size="small" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="flask" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.backupText, { color: activeTheme.accent }]}>
                {isSeeding ? 'Gerando dados mock...' : 'Popular Dados Mock (Seed Dev)'}
              </Text>
            </TouchableOpacity>
          )}
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
