import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsContext } from '../context/SettingsContext';
import { useCategories } from '../hooks/useCategories';
import { resolveCategory } from '../services/categorizer';
import SwipeableCard from '../components/ui/SwipeableCard';
import TransactionModal from '../components/TransactionModal';
import { getZoomFactor } from '../utils/scaler';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';

export default function ExtractionReviewScreen({ route, navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const { categoryList, saveCategory } = useCategories();
  const { saveTransaction } = useTransactions();
  const { loadAccounts } = useAccounts();
  
  const initialTxs = route.params?.transactions || [];
  const [txs, setTxs] = useState(initialTxs.map((t, idx) => ({ ...t, _tempId: idx })));
  
  const [editingTx, setEditingTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const removeTx = (tempId) => {
    setTxs(prev => prev.filter(t => t._tempId !== tempId));
  };

  const handleEditSave = (data) => {
    setTxs(prev => prev.map(t => t._tempId === data._tempId ? { ...t, ...data, confidence: 1 } : t));
    setModalVisible(false);
    setEditingTx(null);
  };

  const saveAll = async () => {
    if (txs.length === 0) {
      Alert.alert('Vazio', 'Nenhuma transação para salvar.');
      return;
    }
    setIsSaving(true);
    try {
      for (let tx of txs) {
        const { _tempId, confidence, ...dbData } = tx;
        dbData.isPending = 0; // Se o usuário aprovou a tela, não é mais pendente
        if (!dbData.categoryId) {
          const catInfo = resolveCategory(dbData, categoryList);
          if (catInfo.isAiSuggestion) {
            const newCatId = await saveCategory(null, {
              name: catInfo.categoryName,
              icon: catInfo.icon,
              color: catInfo.color,
              macro: 'Outros'
            });
            dbData.categoryId = newCatId;
          } else {
            dbData.categoryId = catInfo.id || null;
          }
        }
        await saveTransaction(null, dbData);
      }
      await loadAccounts();
      Alert.alert('Sucesso', `${txs.length} transações importadas com sucesso!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as transações.');
      setIsSaving(false);
    }
  };

  const discardAll = () => {
    Alert.alert('Descartar Tudo', 'Tem certeza que deseja cancelar e apagar toda a importação?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim, Descartar', style: 'destructive', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { backgroundColor: activeTheme.card }]}>
        <TouchableOpacity style={styles.backBtn} onPress={discardAll}>
          <Ionicons name="close" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Revisar Importação</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={activeTheme.accent} />
          <Text style={[styles.infoText, { color: activeTheme.text }]}>
            Encontramos {txs.length} transação(ões). Deslize para excluir ou toque para editar. Transações marcadas em vermelho precisam da sua atenção.
          </Text>
        </View>

        {txs.map((item) => {
          const catInfo = resolveCategory(item, categoryList);
          const needsReview = item.confidence !== undefined && item.confidence < 0.8;
          const dateStr = new Date(item.date).toLocaleDateString('pt-BR');

          return (
            <SwipeableCard key={item._tempId} onDelete={() => removeTx(item._tempId)}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingTx(item); setModalVisible(true); }}>
                <View style={[styles.card, { backgroundColor: activeTheme.card, borderColor: needsReview ? activeTheme.expense : 'transparent', borderWidth: needsReview ? 1 : 0 }]}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.iconBox, { backgroundColor: catInfo.color + '20' }]}>
                      <Ionicons name={catInfo.icon} size={20} color={catInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.desc, { color: activeTheme.text }]} numberOfLines={1}>{item.description}</Text>
                        {needsReview && (
                          <View style={{ backgroundColor: activeTheme.expense + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
                            <Text style={{ color: activeTheme.expense, fontSize: 10, fontWeight: 'bold' }}>Revisar</Text>
                          </View>
                        )}
                        {catInfo.isAiSuggestion && (
                          <View style={{ backgroundColor: catInfo.color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="sparkles" size={10} color={catInfo.color} style={{ marginRight: 2 }} />
                            <Text style={{ color: catInfo.color, fontSize: 10, fontWeight: 'bold' }}>IA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.date, { color: activeTheme.textSecondary }]}>{dateStr} • {catInfo.categoryName}</Text>
                    </View>
                  </View>
                  <Text style={[styles.amount, { color: item.type === 'income' ? activeTheme.income : activeTheme.expense }]}>
                    {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            </SwipeableCard>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: activeTheme.card }]}>
        <TouchableOpacity style={[styles.btn, styles.btnDiscard]} onPress={discardAll}>
          <Text style={styles.btnDiscardText}>Descartar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSave, { backgroundColor: activeTheme.accent, opacity: isSaving ? 0.5 : 1 }]} onPress={saveAll} disabled={isSaving}>
          <Text style={[styles.btnSaveText, { color: '#121212' }]}>{isSaving ? 'Salvando...' : 'Salvar Todas'}</Text>
        </TouchableOpacity>
      </View>

      <TransactionModal 
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingTx(null); }}
        onSave={handleEditSave}
        onDelete={(id) => {
          removeTx(editingTx._tempId);
          setModalVisible(false);
          setEditingTx(null);
        }}
        initialData={editingTx}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, borderBottomWidth: 1, borderBottomColor: theme.cardSecondary },
    backBtn: { width: 40 * z, height: 40 * z, justifyContent: 'center' },
    title: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    scroll: { padding: 16 * z, paddingBottom: 40 * z },
    infoBox: { flexDirection: 'row', backgroundColor: theme.accent + '20', padding: 16 * z, borderRadius: 12 * z, marginBottom: 16 * z, alignItems: 'center' },
    infoText: { flex: 1, marginLeft: 12 * z, fontSize: 13 * z, fontFamily: f, lineHeight: 18 * z },
    
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, borderRadius: 16 * z, marginBottom: 12 * z },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 44 * z, height: 44 * z, borderRadius: 22 * z, justifyContent: 'center', alignItems: 'center', marginRight: 14 * z },
    desc: { fontSize: 16 * z, fontWeight: '600', marginBottom: 4 * z, fontFamily: f },
    date: { fontSize: 13 * z, fontFamily: f },
    amount: { fontSize: 16 * z, fontWeight: '700', marginLeft: 8 * z, fontFamily: f },

    footer: { flexDirection: 'row', padding: 16 * z, borderTopWidth: 1, borderTopColor: theme.cardSecondary },
    btn: { flex: 1, paddingVertical: 14 * z, borderRadius: 12 * z, alignItems: 'center', justifyContent: 'center' },
    btnDiscard: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.expense, marginRight: 8 * z },
    btnDiscardText: { color: theme.expense, fontWeight: 'bold', fontSize: 16 * z, fontFamily: f },
    btnSave: { marginLeft: 8 * z },
    btnSaveText: { fontWeight: 'bold', fontSize: 16 * z, fontFamily: f }
  });
};
