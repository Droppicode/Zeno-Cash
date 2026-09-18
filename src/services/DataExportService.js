import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { expoDb } from '../database/db';
import { TransactionRepository } from './TransactionRepository';
import { Alert, Platform, NativeModules } from 'react-native';
import { Logger } from '../utils/logger';

export const DataExportService = {
  exportToJSON: async () => {
    try {
      const accounts = await expoDb.getAllAsync('SELECT * FROM accounts');
      const transactions = await expoDb.getAllAsync('SELECT * FROM transactions');
      const categories = await expoDb.getAllAsync('SELECT * FROM categories');
      const recurrences = await expoDb.getAllAsync('SELECT * FROM recurrences');
      const debts = await expoDb.getAllAsync('SELECT * FROM debts');
      const settingsTable = await expoDb.getAllAsync('SELECT * FROM settings');

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { accounts, transactions, categories, recurrences, debts, settingsTable }
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const fileUri = FileSystem.cacheDirectory + 'zenocash_export.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      if (await Sharing.isAvailableAsync()) {
        setTimeout(async () => {
          try {
            await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar Backup JSON' });
          } catch (shareErr) {
            if (!shareErr.message.includes('current activity') && !shareErr.message.includes('Another share request')) {
              console.error(shareErr);
            }
          }
        }, 150);
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (err) {
      Logger.error('DataExportService.exportToJSON', err);
      Alert.alert('Erro', 'Não foi possível exportar os dados para JSON.');
    }
  },

  exportToCSV: async () => {
    try {
      const query = `
        SELECT 
          t.id, t.amount, t.description, t.type, t.date, t.note, t.is_pending,
          c.name as category_name, a.name as account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        ORDER BY t.date DESC
      `;
      const txs = await expoDb.getAllAsync(query);
      
      let csvStr = 'ID,Valor,Descricao,Tipo,Data,Nota,Status,Categoria,Conta\n';
      txs.forEach(t => {
        const dateStr = new Date(t.date).toISOString().split('T')[0];
        const status = t.is_pending ? 'Pendente' : 'Confirmado';
        const amount = t.amount.toFixed(2);
        const desc = (t.description || '').replace(/,/g, '');
        const note = (t.note || '').replace(/,/g, '');
        const cat = (t.category_name || '').replace(/,/g, '');
        const acc = (t.account_name || '').replace(/,/g, '');
        csvStr += `${t.id},${amount},${desc},${t.type},${dateStr},${note},${status},${cat},${acc}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + 'zenocash_transactions.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvStr);

      if (await Sharing.isAvailableAsync()) {
        setTimeout(async () => {
          try {
            await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Transações CSV' });
          } catch (shareErr) {
            if (!shareErr.message.includes('current activity') && !shareErr.message.includes('Another share request')) {
              console.error(shareErr);
            }
          }
        }, 150);
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (err) {
      Logger.error('DataExportService.exportToCSV', err);
      Alert.alert('Erro', 'Não foi possível exportar os dados para CSV.');
    }
  },

  createAutoBackup: async () => {
    try {
      const accounts = await expoDb.getAllAsync('SELECT * FROM accounts');
      const transactions = await expoDb.getAllAsync('SELECT * FROM transactions');
      const categories = await expoDb.getAllAsync('SELECT * FROM categories');
      const recurrences = await expoDb.getAllAsync('SELECT * FROM recurrences');
      const debts = await expoDb.getAllAsync('SELECT * FROM debts');
      const settingsTable = await expoDb.getAllAsync('SELECT * FROM settings');

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { accounts, transactions, categories, recurrences, debts, settingsTable }
      };

      const jsonStr = JSON.stringify(data);
      const fileUri = FileSystem.cacheDirectory + 'zenocash_auto_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);
    } catch (err) {
      Logger.error('DataExportService.createAutoBackup', err);
    }
  },

  hasAutoBackup: async () => {
    try {
      const fileUri = FileSystem.cacheDirectory + 'zenocash_auto_backup.json';
      const info = await FileSystem.getInfoAsync(fileUri);
      return info.exists;
    } catch (err) {
      return false;
    }
  },

  restoreAutoBackup: async () => {
    try {
      const fileUri = FileSystem.cacheDirectory + 'zenocash_auto_backup.json';
      const jsonStr = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(jsonStr);
      if (!data.version || !data.data) throw new Error('Invalid auto backup');
      await DataExportService.executeImport(data, 'replace');
      Alert.alert('Restaurado', 'Seus dados anteriores foram restaurados com sucesso!');
    } catch (err) {
      Logger.error('DataExportService.restoreAutoBackup', err);
      Alert.alert('Erro', 'Não foi possível desfazer a importação.');
    }
  },

  pickAndReadJSON: async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled) return null;

      const fileUri = result.assets[0].uri;
      const jsonStr = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(jsonStr);

      if (!data.version || !data.data) {
        Alert.alert('Erro', 'Arquivo JSON inválido ou não suportado.');
        return null;
      }
      return data;
    } catch (err) {
      Logger.error('DataExportService.pickAndReadJSON', err);
      Alert.alert('Erro', 'Não foi possível ler o arquivo JSON.');
      return null;
    }
  },

  executeImport: async (data, mode = 'merge') => {
    try {
      const { accounts = [], transactions = [], categories = [], recurrences = [], debts = [], settingsTable = [] } = data.data;

      await expoDb.withTransactionAsync(async () => {
        const insertWithoutId = async (table, rows) => {
          for (const row of rows) {
            const { id, ...rest } = row;
            if (Object.keys(rest).length === 0) continue;
            const cols = Object.keys(rest).join(', ');
            const placeholders = Object.keys(rest).map(() => '?').join(', ');
            const values = Object.values(rest);
            await expoDb.runAsync(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
          }
        };

        const insertWithId = async (table, rows) => {
          for (const row of rows) {
            const keys = Object.keys(row);
            if (keys.length === 0) continue;
            const cols = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = Object.values(row);
            await expoDb.runAsync(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
          }
        };

        if (mode === 'replace') {
          await expoDb.execAsync('DELETE FROM recurrences; DELETE FROM categories; DELETE FROM accounts; DELETE FROM settings; DELETE FROM transactions; DELETE FROM debts;');

          if (accounts.length > 0) await insertWithId('accounts', accounts);
          if (categories.length > 0) await insertWithId('categories', categories);
          if (transactions.length > 0) await insertWithId('transactions', transactions);
          if (recurrences.length > 0) await insertWithId('recurrences', recurrences);
          if (debts.length > 0) await insertWithId('debts', debts);
        } else {
          if (accounts.length > 0) await insertWithoutId('accounts', accounts);
          if (categories.length > 0) await insertWithoutId('categories', categories);
          if (transactions.length > 0) await insertWithoutId('transactions', transactions);
          if (recurrences.length > 0) await insertWithoutId('recurrences', recurrences);
          if (debts.length > 0) await insertWithoutId('debts', debts);
        }
        
        if (settingsTable && settingsTable.length > 0) {
          for (const s of settingsTable) {
            await expoDb.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
          }
        }
      });
    } catch (err) {
      Logger.error('DataExportService.executeImport', err);
      throw err;
    }
  },

  importFromCSV: async () => {
    Alert.alert('Aviso', 'A importação de CSV será implementada em uma versão futura. Por favor, use JSON para restaurar backups completos.');
  },

  createSilentLocalBackup: async () => {
    try {
      await expoDb.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      const backupDir = `${FileSystem.documentDirectory}ZenoCashBackups/`;
      
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      const dbFileUri = `${FileSystem.documentDirectory}SQLite/zenocash.db`;
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`;
      const backupUri = `${backupDir}zenocash_autobackup_${dateStr}.db`;
      
      // Clean up old backups (keep only the 5 most recent)
      const files = await FileSystem.readDirectoryAsync(backupDir);
      const dbFiles = files.filter(f => f.startsWith('zenocash_autobackup_') && f.endsWith('.db')).sort();
      if (dbFiles.length >= 5) {
        const toDelete = dbFiles.slice(0, dbFiles.length - 4); // Leave 4 to add 1 new
        for (const file of toDelete) {
          await FileSystem.deleteAsync(`${backupDir}${file}`, { idempotent: true });
        }
      }

      await FileSystem.copyAsync({ from: dbFileUri, to: backupUri });
      Logger.info('Local silent backup created successfully', backupUri);
    } catch (e) {
      Logger.error('createSilentLocalBackup', e);
    }
  },

  viewLocalAutoBackups: async () => {
    try {
      const backupDir = `${FileSystem.documentDirectory}ZenoCashBackups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        Alert.alert('Aviso', 'Nenhum backup automático local encontrado ainda.');
        return;
      }

      const files = await FileSystem.readDirectoryAsync(backupDir);
      const dbFiles = files.filter(f => (f.startsWith('zenocash_autobackup_') || f.startsWith('zenocash_backup_')) && f.endsWith('.db')).sort().reverse();

      if (dbFiles.length === 0) {
        Alert.alert('Aviso', 'Nenhum backup automático local encontrado ainda.');
        return;
      }

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          let copied = 0;
          for (const file of dbFiles) {
            try {
              const base64Content = await FileSystem.readAsStringAsync(`${backupDir}${file}`, { encoding: FileSystem.EncodingType.Base64 });
              const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri, 
                file, 
                'application/octet-stream'
              );
              await FileSystem.writeAsStringAsync(uri, base64Content, { encoding: FileSystem.EncodingType.Base64 });
              copied++;
              await FileSystem.deleteAsync(`${backupDir}${file}`, { idempotent: true });
            } catch (e) {
              console.error('Error copying file', file, e);
            }
          }
          Alert.alert('Sucesso', `Foram encontrados ${dbFiles.length} backups. ${copied} foram extraídos com sucesso para a pasta escolhida!`);
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          setTimeout(async () => {
            try {
              await Sharing.shareAsync(`${backupDir}${dbFiles[0]}`, { mimeType: 'application/octet-stream', dialogTitle: 'Salvar Último Backup Local' });
              await FileSystem.deleteAsync(`${backupDir}${dbFiles[0]}`, { idempotent: true });
            } catch (shareErr) {
              if (!shareErr.message.includes('current activity') && !shareErr.message.includes('Another share request')) {
                console.error(shareErr);
              }
            }
          }, 150);
        }
      }
    } catch (e) {
      Logger.error('viewLocalAutoBackups', e);
      Alert.alert('Erro', 'Não foi possível acessar a pasta de backups.');
    }
  },

  exportDBLocal: async () => {
    try {
      await expoDb.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      const backupDir = `${FileSystem.documentDirectory}ZenoCashBackups/`;
      
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      const dbFileUri = `${FileSystem.documentDirectory}SQLite/zenocash.db`;
      
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`;
      const backupUri = `${backupDir}zenocash_backup_${dateStr}.db`;
      
      await FileSystem.copyAsync({ from: dbFileUri, to: backupUri });
      Alert.alert('Sucesso', 'Backup criado na memória do Zeno Cash! Use "Salvar Backups no Celular" para exportá-lo.');
    } catch (err) {
      Logger.error('DataExportService.exportDBLocal', err);
      Alert.alert('Erro', 'Não foi possível exportar o banco de dados.');
    }
  },

  importDBLocal: async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) return false;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name.toLowerCase();

      if (!fileName.endsWith('.db') && !fileName.endsWith('.sqlite') && !fileName.endsWith('.json')) {
        Alert.alert('Erro', 'Por favor, selecione um arquivo válido (.db, .sqlite, ou .json).');
        return false;
      }

      if (fileName.endsWith('.json')) {
          const jsonStr = await FileSystem.readAsStringAsync(fileUri);
          const data = JSON.parse(jsonStr);
          if (!data.version || !data.data) {
            Alert.alert('Erro', 'Arquivo JSON inválido.');
            return false;
          }
          await DataExportService.createAutoBackup();
          await DataExportService.executeImport(data, 'replace');
          Alert.alert('Sucesso', 'Dados do JSON restaurados! Reinicie o aplicativo completamente.');
          return true;
      }

      await DataExportService.createAutoBackup();
      const dbDestUri = `${FileSystem.documentDirectory}SQLite/zenocash.db`;
      
      try { await expoDb.closeAsync(); } catch (e) {}

      await FileSystem.copyAsync({ from: fileUri, to: dbDestUri });

      try {
        const walUri = `${FileSystem.documentDirectory}SQLite/zenocash.db-wal`;
        const shmUri = `${FileSystem.documentDirectory}SQLite/zenocash.db-shm`;
        const walInfo = await FileSystem.getInfoAsync(walUri);
        if (walInfo.exists) await FileSystem.deleteAsync(walUri);
        const shmInfo = await FileSystem.getInfoAsync(shmUri);
        if (shmInfo.exists) await FileSystem.deleteAsync(shmUri);
      } catch(e) {}

      Alert.alert(
        'Sucesso', 
        'Banco de dados restaurado com sucesso! O aplicativo precisa ser recarregado.',
        [{ text: 'OK', onPress: () => {
            if (__DEV__ && NativeModules.DevSettings) {
              NativeModules.DevSettings.reload();
            }
        }}]
      );
      return true;
    } catch (err) {
      Logger.error('DataExportService.importDBLocal', err);
      Alert.alert('Erro', 'Não foi possível restaurar o backup.');
      return false;
    }
  }
};
