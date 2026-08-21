import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { expoDb } from '../database/db';
import { TransactionRepository } from './TransactionRepository';
import { Alert } from 'react-native';
import { Logger } from '../utils/logger';

export const DataExportService = {
  exportToJSON: async () => {
    try {
      const accounts = await expoDb.getAllAsync('SELECT * FROM accounts');
      const transactions = await expoDb.getAllAsync('SELECT * FROM transactions');
      const categories = await expoDb.getAllAsync('SELECT * FROM categories');
      const recurrences = await expoDb.getAllAsync('SELECT * FROM recurrences');
      const debts = await expoDb.getAllAsync('SELECT * FROM debts');

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { accounts, transactions, categories, recurrences, debts }
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const fileUri = FileSystem.cacheDirectory + 'zenocash_export.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar Backup JSON' });
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
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Transações CSV' });
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (err) {
      Logger.error('DataExportService.exportToCSV', err);
      Alert.alert('Erro', 'Não foi possível exportar os dados para CSV.');
    }
  },

  importFromJSON: async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const jsonStr = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(jsonStr);

      if (!data.version || !data.data) {
        Alert.alert('Erro', 'Arquivo JSON inválido ou não suportado.');
        return;
      }

      const { accounts = [], transactions = [], categories = [], recurrences = [], debts = [] } = data.data;

      await expoDb.execAsync('BEGIN TRANSACTION;');

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

      await insertWithoutId('accounts', accounts);
      await insertWithoutId('categories', categories);
      await insertWithoutId('transactions', transactions);
      await insertWithoutId('recurrences', recurrences);
      await insertWithoutId('debts', debts);

      await expoDb.execAsync('COMMIT;');
      
      await TransactionRepository.initMonthlyBalances();
      Alert.alert('Sucesso', 'Dados importados com sucesso! Reinicie o aplicativo para recarregar as informações.');

    } catch (err) {
      try { await expoDb.execAsync('ROLLBACK;'); } catch (e) {}
      Logger.error('DataExportService.importFromJSON', err);
      Alert.alert('Erro', 'Ocorreu um erro ao importar o arquivo.');
    }
  },

  importFromCSV: async () => {
    Alert.alert('Aviso', 'A importação de CSV será implementada em uma versão futura. Por favor, use JSON para restaurar backups completos.');
  }
};
