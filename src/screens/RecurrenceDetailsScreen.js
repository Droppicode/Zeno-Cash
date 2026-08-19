import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../database/db';
import { recurrences, transactions } from '../database/schema';
import { eq } from 'drizzle-orm';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { getZoomFactor } from '../utils/scaler';
import { RecurrenceGenerator } from '../services/RecurrenceGenerator';
import { resolveCategory } from '../services/categorizer';
import { RecurrenceRepository } from '../services/RecurrenceRepository';
import { materializeRecurrencesUpToToday } from '../services/BackgroundTasks';
import TransactionModal from '../components/TransactionModal';

export default function RecurrenceDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const { activeTheme } = useContext(SettingsContext);
  const { txList, loadTransactions, updateTransaction } = useTransactions();
  const { categoryList, loadCategories } = useCategories();
  
  const [recurrence, setRecurrence] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [editModalVisible, setEditModalVisible] = useState(false);

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';
  const styles = React.useMemo(() => getStyles(z, f), [z, f]);

  useEffect(() => {
    loadTransactions();
    loadCategories();
    fetchRecurrence();
  }, []);

  const fetchRecurrence = async () => {
    try {
      const result = await db.select().from(recurrences).where(eq(recurrences.id, id));
      if (result.length > 0) {
        setRecurrence(result[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async (data) => {
    const { recurrenceType, recurrenceData, date, ...txParams } = data;
    
    // We only update if it is still a recurrence. If they set it to "single", we could technically
    // cancel the contract and leave it as a single transaction, but for simplicity we assume they just update it.
    if (recurrenceData) {
      await RecurrenceRepository.update(id, {
        amount: txParams.amount,
        description: txParams.description,
        categoryId: txParams.categoryId,
        type: txParams.type,
        accountId: txParams.accountId,
        startDate: date,
        ...recurrenceData
      });
      
      // Excluir todas as transações (pendentes/pagas) antigas deste contrato
      await db.delete(transactions).where(eq(transactions.recurrenceId, id));

      // Re-materializar as novas transações baseadas no contrato atualizado
      await materializeRecurrencesUpToToday();
      
      await loadTransactions();
      await fetchRecurrence();
    } else {
      Alert.alert('Erro', 'O contrato não pode ser convertido em uma transação única por aqui.');
    }
    
    setEditModalVisible(false);
  };

  const cancelRecurrence = async () => {
    Alert.alert(
      "Cancelar Contrato",
      "Isso fará com que faturas futuras não sejam mais geradas. As transações antigas serão mantidas. Deseja continuar?",
      [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: async () => {
            await RecurrenceRepository.update(id, { isActive: 0 });
            await fetchRecurrence();
            setEditModalVisible(false);
          }
        }
      ]
    );
  };

  const deleteRecurrence = async () => {
    Alert.alert(
      "Excluir Contrato e Histórico",
      "Isso irá apagar o contrato e TODAS as transações passadas ou pendentes vinculadas a ele. Esta ação é irreversível!",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir Tudo", style: "destructive", onPress: async () => {
            // Deletar as transações vinculadas
            await db.delete(transactions).where(eq(transactions.recurrenceId, id));
            // Deletar a recorrência
            await RecurrenceRepository.remove(id);
            await loadTransactions();
            navigation.goBack();
          }
        }
      ]
    );
  };

  const recoverTransaction = async (id) => {
    await updateTransaction(id, { isIgnored: 0, isPending: 1 });
    await loadTransactions();
  };

  const combinedList = useMemo(() => {
    if (!recurrence) return [];

    // Txs reais ligadas a essa recorrência
    const realTxs = txList.filter(t => t.recurrenceId === recurrence.id);

    // Projetar futuras (+365 dias para mostrar um longo horizonte de parcelas/assinaturas)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 365);

    const virtualTxs = RecurrenceGenerator.generateVirtualTransactions(
      [recurrence],
      realTxs,
      maxDate.getTime()
    );

    // Junta as reais com as virtuais projetadas (só as do futuro)
    const futureVirtuals = virtualTxs.filter(v => v.date > Date.now());
    
    // Mescla
    const merged = [...realTxs, ...futureVirtuals];
    
    // Ordena da mais antiga para a mais nova
    return merged.sort((a, b) => a.date - b.date);

  }, [recurrence, txList]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: activeTheme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={activeTheme.accent} />
      </View>
    );
  }

  if (!recurrence) {
    return (
      <View style={[styles.container, { backgroundColor: activeTheme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: activeTheme.text }}>Recorrência não encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: activeTheme.accent }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const catInfo = resolveCategory({ categoryId: recurrence.categoryId, description: recurrence.description }, categoryList);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { backgroundColor: activeTheme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Detalhes do Contrato</Text>
        <TouchableOpacity onPress={() => setEditModalVisible(true)} style={{ padding: 8 }}>
          <Ionicons name="pencil" size={20} color={activeTheme.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 * z }}>
        <View style={[styles.card, { backgroundColor: activeTheme.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 * z }}>
            <View style={[styles.iconBox, { backgroundColor: catInfo.color + '20' }]}>
              <Ionicons name={catInfo.icon} size={24 * z} color={catInfo.color} />
            </View>
            <View style={{ marginLeft: 12 * z, flex: 1 }}>
              <Text style={{ color: activeTheme.text, fontSize: 20 * z, fontWeight: 'bold' }}>{recurrence.description}</Text>
              <Text style={{ color: activeTheme.textSecondary, fontSize: 14 * z }}>{catInfo.categoryName}</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 * z }}>
            <Text style={{ color: activeTheme.textSecondary }}>Valor Base</Text>
            <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>R$ {recurrence.amount.toFixed(2)}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 * z }}>
            <Text style={{ color: activeTheme.textSecondary }}>Tipo</Text>
            <Text style={{ color: activeTheme.text, fontWeight: 'bold', textTransform: 'capitalize' }}>
              {recurrence.installments ? `Parcelado em ${recurrence.installments}x` : 'Assinatura Contínua'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 * z }}>
            <Text style={{ color: activeTheme.textSecondary }}>Juros</Text>
            <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>
              {recurrence.interestRate > 0 ? `${recurrence.interestRate}% (${recurrence.interestType === 'compound' ? 'Composto' : 'Simples'})` : 'Nenhum'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 * z }}>
            <Text style={{ color: activeTheme.textSecondary }}>Data de Início</Text>
            <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>
              {new Date(recurrence.startDate).toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: activeTheme.textSecondary }}>Status</Text>
            <Text style={{ color: recurrence.isActive === 1 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
              {recurrence.isActive === 1 ? 'Ativo' : 'Cancelado'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 * z, marginBottom: 16 * z, paddingHorizontal: 8 * z }}>
          <Text style={{ color: activeTheme.text, fontSize: 18 * z, fontWeight: 'bold' }}>
            Parcelas & Histórico
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 * z }}>
            {recurrence.isActive === 1 && (
              <TouchableOpacity onPress={cancelRecurrence} style={{ padding: 4 * z }}>
                <Ionicons name="close-circle-outline" size={24 * z} color="#FF9800" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={deleteRecurrence} style={{ padding: 4 * z }}>
              <Ionicons name="trash-outline" size={24 * z} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ gap: 12 * z }}>
          {combinedList.map((item, index) => {
            const isVirtual = item.isVirtual;
            const isPending = item.isPending === 1;
            const isIgnored = item.isIgnored === 1;
            const isPaid = !isVirtual && !isPending && !isIgnored;
            
            let statusColor = activeTheme.textSecondary;
            let statusText = 'Desconhecido';
            let iconName = 'help-circle';
            
            if (isIgnored) {
              statusColor = '#9E9E9E';
              statusText = 'Excluído';
              iconName = 'close-circle';
            } else if (isPaid) {
              statusColor = '#4CAF50';
              statusText = 'Pago';
              iconName = 'checkmark-circle';
            } else if (isPending) {
              statusColor = '#FF9800';
              statusText = 'Pendente';
              iconName = 'time';
            } else if (isVirtual) {
              statusColor = activeTheme.accent;
              statusText = 'Futuro';
              iconName = 'calendar';
            }

            return (
              <View key={item.id} style={[styles.txCard, { backgroundColor: activeTheme.card, opacity: isIgnored ? 0.6 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: activeTheme.text, fontSize: 16 * z, fontWeight: 'bold', textDecorationLine: isIgnored ? 'line-through' : 'none' }}>
                    {item.note || `Ocorrência ${index + 1}`}
                  </Text>
                  <Text style={{ color: activeTheme.textSecondary, fontSize: 14 * z, marginTop: 4 * z }}>
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 12 * z }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: activeTheme.text, fontSize: 16 * z, fontWeight: 'bold', textDecorationLine: isIgnored ? 'line-through' : 'none' }}>
                      R$ {item.amount.toFixed(2)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 * z }}>
                      <Ionicons name={iconName} size={14 * z} color={statusColor} />
                      <Text style={{ color: statusColor, fontSize: 12 * z, fontWeight: 'bold', marginLeft: 4 * z }}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                  {isIgnored && (
                    <TouchableOpacity onPress={() => recoverTransaction(item.id)} style={{ padding: 8 * z, backgroundColor: activeTheme.background, borderRadius: 8 * z }}>
                      <Ionicons name="arrow-undo" size={20 * z} color={activeTheme.accent} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <TransactionModal 
        visible={editModalVisible} 
        initialData={recurrence} 
        onClose={() => setEditModalVisible(false)} 
        onSave={handleSaveContract} 
        isContractEdit={true}
      />
    </SafeAreaView>
  );
}

const getStyles = (z, f) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * z,
    paddingVertical: 12 * z,
    elevation: 2,
  },
  title: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
  card: {
    borderRadius: 16 * z,
    padding: 20 * z,
    elevation: 1,
  },
  iconBox: {
    width: 48 * z,
    height: 48 * z,
    borderRadius: 24 * z,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txCard: {
    flexDirection: 'row',
    padding: 16 * z,
    borderRadius: 12 * z,
    alignItems: 'center',
    justifyContent: 'space-between'
  }
});
