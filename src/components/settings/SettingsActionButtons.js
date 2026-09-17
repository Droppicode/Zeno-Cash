import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DataExportService } from '../../services/DataExportService';
import { SettingsContext } from '../../context/SettingsContext';

export function CloudBackupButtons({ activeTheme, styles, dataManagementHook }) {
  const { 
    isBackingUp, isRestoring, handleBackup, handleRestore, 
    executeRestoreBackup, availableBackups, setAvailableBackups, isFetchingBackups,
    isGoogleSignedIn, forceGoogleLogin
  } = dataManagementHook;
  
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const { 
    autoBackupEnabled, autoBackupDestination, saveSetting 
  } = useContext(SettingsContext);

  const [backupMode, setBackupMode] = useState(autoBackupDestination || 'drive'); // 'drive' or 'local'

  const handleModeChange = (mode) => {
    setBackupMode(mode);
    saveSetting('autoBackupDestination', mode);
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {availableBackups.length > 0 && (
        <Modal transparent={true} visible={true} animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: activeTheme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: activeTheme.text, marginBottom: 15 }}>Selecione um Backup</Text>
              <ScrollView style={{ marginBottom: 20 }}>
                {availableBackups.map(b => (
                  <TouchableOpacity 
                    key={b.id} 
                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: activeTheme.border }}
                    onPress={() => executeRestoreBackup(b.id)}
                  >
                    <Text style={{ color: activeTheme.text, fontSize: 16 }}>{b.name}</Text>
                    <Text style={{ color: activeTheme.textSecondary, fontSize: 12, marginTop: 4 }}>
                      Criado em: {formatDate(b.createdTime)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={{ padding: 15, alignItems: 'center', borderRadius: 6, backgroundColor: activeTheme.card }}
                onPress={() => setAvailableBackups([])}
              >
                <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Segmented Control for Backup Mode */}
      <View style={{ flexDirection: 'row', backgroundColor: activeTheme.cardSecondary || activeTheme.card, borderRadius: 6, padding: 4, marginBottom: 15 }}>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 4, backgroundColor: backupMode === 'drive' ? activeTheme.accent + '20' : 'transparent' }}
          onPress={() => handleModeChange('drive')}
        >
          <Text style={{ color: backupMode === 'drive' ? activeTheme.accent : activeTheme.textSecondary, fontWeight: backupMode === 'drive' ? 'bold' : 'normal' }}>
            Google Drive
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 4, backgroundColor: backupMode === 'local' ? activeTheme.accent + '20' : 'transparent' }}
          onPress={() => handleModeChange('local')}
        >
          <Text style={{ color: backupMode === 'local' ? activeTheme.accent : activeTheme.textSecondary, fontWeight: backupMode === 'local' ? 'bold' : 'normal' }}>
            Dispositivo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Auto Backup Toggle */}
      {!(backupMode === 'drive' && !isGoogleSignedIn) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: activeTheme.card, padding: 15, borderRadius: 6, marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 15 }}>
            <Text style={{ color: activeTheme.text, fontSize: 16, fontWeight: 'bold' }}>Backup Automático Diário</Text>
            <Text style={{ color: activeTheme.textSecondary, fontSize: 13, marginTop: 4 }}>
              Sincroniza seus dados em segundo plano silenciosamente para o destino selecionado ({backupMode === 'drive' ? 'Nuvem' : 'Local'}).
            </Text>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={(val) => saveSetting('autoBackupEnabled', val)}
            trackColor={{ false: activeTheme.border, true: activeTheme.accent + '80' }}
            thumbColor={autoBackupEnabled ? activeTheme.accent : '#f4f3f4'}
          />
        </View>
      )}

      {Platform.OS === 'web' ? (
        <View style={{ backgroundColor: activeTheme.card, padding: 20, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: activeTheme.accent + '30' }}>
          <Ionicons name="laptop-outline" size={48} color={activeTheme.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ color: activeTheme.text, fontSize: 16, textAlign: 'center' }}>
            Backups na Nuvem e Locais são funcionalidades exclusivas do aplicativo móvel (Android/iOS).
          </Text>
        </View>
      ) : backupMode === 'drive' && !isGoogleSignedIn ? (
        <View style={{ backgroundColor: activeTheme.card, padding: 20, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: activeTheme.accent + '30' }}>
          <Ionicons name="cloud-offline" size={48} color={activeTheme.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ color: activeTheme.text, fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
            Conecte sua conta do Google para fazer backup automático na nuvem de forma segura.
          </Text>
          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.accent, width: '100%', marginTop: 0 }]} 
            onPress={forceGoogleLogin}
          >
            <Ionicons name="logo-google" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.backupText, { color: activeTheme.accent }]}>
              Conectar com Google
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.accent, opacity: (isBackingUp || isRestoring || isFetchingBackups) ? 0.5 : 1 }]} 
            onPress={backupMode === 'drive' ? handleBackup : () => DataExportService.exportDBLocal()}
            disabled={isBackingUp || isRestoring || isFetchingBackups}
          >
            {isBackingUp ? (
                <ActivityIndicator color={activeTheme.accent} size="small" style={{ marginRight: 8 }} />
            ) : (
                <Ionicons name="cloud-upload-outline" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.backupText, { color: activeTheme.accent }]}>
              {isBackingUp ? 'Salvando...' : 'Fazer Backup Agora'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.expense, marginTop: 12, opacity: (isBackingUp || isRestoring || isFetchingBackups) ? 0.5 : 1 }]} 
            onPress={backupMode === 'drive' ? handleRestore : () => DataExportService.importDBLocal()}
            disabled={isBackingUp || isRestoring || isFetchingBackups}
          >
            {(isRestoring || isFetchingBackups) ? (
                <ActivityIndicator color={activeTheme.expense} size="small" style={{ marginRight: 8 }} />
            ) : (
                <Ionicons name="cloud-download-outline" size={20} color={activeTheme.expense} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.backupText, { color: activeTheme.expense }]}>
              {isFetchingBackups ? 'Buscando...' : isRestoring ? 'Restaurando...' : 'Restaurar Backup'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {backupMode === 'local' && (
        <>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: activeTheme.border }}>
            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.textSecondary, flex: 1, marginTop: 0 }]} 
              onPress={() => DataExportService.exportToJSON()}
            >
              <Ionicons name="document-text" size={18} color={activeTheme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.backupText, { color: activeTheme.textSecondary, fontSize: 13 }]}>Exportar JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.backupBtn, { borderColor: activeTheme.textSecondary, flex: 1, marginTop: 0 }]} 
              onPress={() => DataExportService.exportToCSV()}
            >
              <Ionicons name="stats-chart" size={18} color={activeTheme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.backupText, { color: activeTheme.textSecondary, fontSize: 13 }]}>Exportar CSV</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.backupBtn, { borderColor: activeTheme.income, marginTop: 12 }]} 
            onPress={() => DataExportService.viewLocalAutoBackups()}
          >
            <Ionicons name="download-outline" size={20} color={activeTheme.income} style={{ marginRight: 8 }} />
            <Text style={[styles.backupText, { color: activeTheme.income }]}>Salvar Backups no Celular</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export function DangerZoneButtons({ activeTheme, styles, dataManagementHook }) {
  const { isResetting, isSeeding, handleReset, handleSeed } = dataManagementHook;
  
  return (
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
  );
}
