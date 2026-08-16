import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/db';
import { transactions } from '../database/schema';
import { categorizeTransaction } from '../services/categorizer';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SettingsContext } from '../context/SettingsContext';

const INITIAL_MAPPING = {
  'Alimentação': 'Essenciais', 'Supermercado': 'Essenciais', 'Restaurante': 'Essenciais', 'Ifood': 'Essenciais', 'Padaria': 'Essenciais',
  'Transporte': 'Essenciais', 'Gasolina': 'Essenciais', 'Uber': 'Essenciais', 'Passagem': 'Essenciais', 'Pedágio': 'Essenciais',
  'Moradia': 'Essenciais', 'Aluguel': 'Essenciais', 'Luz': 'Essenciais', 'Água': 'Essenciais', 'Internet': 'Essenciais',
  'Saúde': 'Essenciais', 'Farmácia': 'Essenciais', 'Médico': 'Essenciais',
  'Educação': 'Essenciais', 'Cursos': 'Essenciais', 'Livros': 'Essenciais',
  'Lazer': 'Estilo de Vida', 'Cinema': 'Estilo de Vida', 'Shows': 'Estilo de Vida', 'Jogos': 'Estilo de Vida',
  'Investimento': 'Investimento', 'Ações': 'Investimento', 'FIIs': 'Investimento', 'Tesouro': 'Investimento',
  'Outros': 'Outros', 'Transferência': 'Outros'
};

const COLORS_PALETTE = ['#F44336', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FFC107', '#8BC34A', '#795548'];

// Componente para a linha editável do Macro
const MacroRow = ({ macro, target, onUpdateName, onUpdateTarget, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(macro);

  const handleSaveName = () => {
    if (tempName.trim() === '') {
      setTempName(macro);
      setIsEditing(false);
      return;
    }
    onUpdateName(macro, tempName.trim());
    setIsEditing(false);
  };

  return (
    <View style={styles.goalInputRow}>
      {isEditing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TextInput 
            style={[styles.goalInput, { flex: 1, textAlign: 'left' }]} 
            value={tempName} 
            onChangeText={setTempName} 
            autoFocus 
          />
          <TouchableOpacity onPress={handleSaveName} style={{ marginLeft: 8 }}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 4, marginRight: 4 }}>
            <Ionicons name="pencil" size={16} color="#888" />
          </TouchableOpacity>
          <Text style={styles.goalLabel} numberOfLines={1}>{macro}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
        <TextInput
          style={styles.goalInput}
          keyboardType="numeric"
          value={String(target)}
          onChangeText={(val) => onUpdateTarget(macro, val)}
        />
        <Text style={{ color: '#fff', marginLeft: 8 }}>%</Text>
        
        <TouchableOpacity onPress={() => onRemove(macro)} style={{ marginLeft: 16, padding: 4 }}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AnalyticsScreen() {
  const { accentColor, uiConfig, defaultPeriod } = React.useContext(SettingsContext);

  const [analyticsData, setAnalyticsData] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [period, setPeriod] = useState(defaultPeriod || '30d');
  const [isMacro, setIsMacro] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topExpenses, setTopExpenses] = useState([]);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  
  const [macroOptions, setMacroOptions] = useState(['Essenciais', 'Estilo de Vida', 'Investimento']);
  const [newMacroName, setNewMacroName] = useState('');
  
  const [macroTargets, setMacroTargets] = useState({
    'Essenciais': 50,
    'Estilo de Vida': 30,
    'Investimento': 20,
    'Outros': 0
  });

  const [macroMapping, setMacroMapping] = useState(INITIAL_MAPPING);

  // Mutações de Macros Dinâmicos
  const updateMacroName = (oldName, newName) => {
    if (oldName === newName) return;
    if (macroOptions.includes(newName)) return; // Evita duplicatas
    
    setMacroOptions(prev => prev.map(m => m === oldName ? newName : m));
    
    setMacroTargets(prev => {
      const next = { ...prev };
      next[newName] = next[oldName];
      delete next[oldName];
      return next;
    });

    setMacroMapping(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(micro => {
        if (next[micro] === oldName) next[micro] = newName;
      });
      return next;
    });
  };

  const updateTarget = (cat, val) => {
    setMacroTargets(prev => ({ ...prev, [cat]: Number(val) }));
  };

  const removeMacro = (macro) => {
    setMacroOptions(prev => prev.filter(m => m !== macro));
    setMacroTargets(prev => {
      const next = { ...prev };
      delete next[macro];
      return next;
    });
    setMacroMapping(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(micro => {
        if (next[micro] === macro) next[micro] = 'Outros';
      });
      return next;
    });
  };

  const addMacro = () => {
    const name = newMacroName.trim();
    if (name && !macroOptions.includes(name) && name !== 'Outros') {
      setMacroOptions([...macroOptions, name]);
      setMacroTargets(prev => ({ ...prev, [name]: 0 }));
      setNewMacroName('');
    }
  };

  const cycleMacroMapping = (microCat) => {
    const availableMacros = [...macroOptions, 'Outros'];
    setMacroMapping(prev => {
      const current = prev[microCat] || 'Outros';
      const nextIdx = (availableMacros.indexOf(current) + 1) % availableMacros.length;
      return { ...prev, [microCat]: availableMacros[nextIdx] };
    });
  };

  const loadData = async () => {
    try {
      const data = await db.select().from(transactions);
      
      const now = new Date().getTime();
      let limitDate = 0;
      if (period === '30d') limitDate = now - (30 * 24 * 60 * 60 * 1000);
      else if (period === '90d') limitDate = now - (90 * 24 * 60 * 60 * 1000);

      const uniqueCatsFromTx = Array.from(new Set(data.map(t => categorizeTransaction(t.description, t.amount).categoryName)));
      setMacroMapping(prev => {
        let updated = { ...prev };
        let changed = false;
        uniqueCatsFromTx.forEach(cat => {
          if (!updated[cat]) {
            updated[cat] = 'Outros';
            changed = true;
          }
        });
        return changed ? updated : prev;
      });

      const last6Months = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
        last6Months[key] = { label, income: 0, expense: 0 };
      }
      
      data.forEach(tx => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (last6Months[key]) {
          if (tx.type === 'income') last6Months[key].income += tx.amount;
          if (tx.type === 'expense') last6Months[key].expense += tx.amount;
        }
      });
      
      const barData = [];
      Object.values(last6Months).forEach(item => {
        barData.push({ 
          value: item.income, 
          frontColor: '#4CAF50', 
          label: item.label, 
          spacing: 2, 
          labelTextStyle: { color: '#888', fontSize: 10 } 
        });
        barData.push({ value: item.expense, frontColor: '#F44336' });
      });
      setMonthlyData(barData);

      const expenses = data.filter(t => t.type === 'expense' && t.date >= limitDate);
      const incomes = data.filter(t => t.type === 'income' && t.date >= limitDate);
      
      const sumIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
      setTotalIncome(sumIncome);

      const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
      setTopExpenses(top3);
      
      let sum = 0;
      const grouped = {};

      if (isMacro) {
        macroOptions.forEach(key => {
          grouped[key] = { name: key, total: 0, color: '#333' };
        });
        grouped['Outros'] = { name: 'Outros', total: 0, color: '#888' };
      }

      expenses.forEach(tx => {
        sum += tx.amount;
        const catInfo = categorizeTransaction(tx.description, tx.amount);
        let finalCatName = catInfo.categoryName;
        let finalColor = catInfo.color;
        
        if (isMacro) {
          finalCatName = macroMapping[catInfo.categoryName] || 'Outros';
        }

        if (!grouped[finalCatName]) {
          grouped[finalCatName] = { name: finalCatName, total: 0, color: finalColor };
        }
        grouped[finalCatName].total += tx.amount;
        if (!isMacro) grouped[finalCatName].color = catInfo.color;
      });

      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
      
      if (isMacro) {
        sorted.forEach((item, idx) => {
          if (item.name === 'Outros') item.color = '#888888';
          else item.color = COLORS_PALETTE[idx % COLORS_PALETTE.length];
        });
      }

      setTotalExpense(sum);
      setAnalyticsData(sorted);
    } catch (err) {
      console.log('Erro db:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [period, isMacro, macroTargets, macroMapping, macroOptions])
  );

  const pieData = analyticsData.filter(i => i.total > 0).map(item => ({
    value: item.total,
    color: item.color,
    text: totalExpense > 0 ? `${((item.total / totalExpense) * 100).toFixed(0)}%` : '0%'
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Análise Avançada</Text>
        <View style={styles.periodRow}>
          <TouchableOpacity style={[styles.periodBtn, period === '30d' && { backgroundColor: accentColor }]} onPress={() => setPeriod('30d')}>
            <Text style={[styles.periodText, period === '30d' && { color: '#121212' }]}>30 Dias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.periodBtn, period === '90d' && { backgroundColor: accentColor }]} onPress={() => setPeriod('90d')}>
            <Text style={[styles.periodText, period === '90d' && { color: '#121212' }]}>90 Dias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.periodBtn, period === 'all' && { backgroundColor: accentColor }]} onPress={() => setPeriod('all')}>
            <Text style={[styles.periodText, period === 'all' && { color: '#121212' }]}>Sempre</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Gráfico 1: Barras 6 Meses */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evolução de 6 Meses</Text>
          <Text style={styles.cardSubtitle}>Receitas (Verde) vs Despesas (Vermelho)</Text>
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            {monthlyData.length > 0 ? (
              <BarChart
                data={monthlyData}
                barWidth={12}
                spacing={16}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: '#888', fontSize: 10 }}
                noOfSections={4}
                barBorderRadius={6}
                frontColor="lightgray"
                height={150}
              />
            ) : <Text style={styles.emptyText}>Carregando...</Text>}
          </View>
        </View>

        {/* Resumo Financeiro */}
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Text style={styles.subtitle}>Gasto Total no Período Selecionado</Text>
          <Text style={styles.totalValue}>R$ {totalExpense.toFixed(2)}</Text>
        </View>

        {/* Gráfico 2: Composição (Donut) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Composição</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {isMacro && (
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowGoalModal(true)}>
                  <Ionicons name="options-outline" size={16} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsMacro(!isMacro)}>
                <Text style={[styles.toggleText, { color: accentColor }]}>{isMacro ? 'Ver Detalhado' : 'Agrupar Macro'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {isMacro && (
            <Text style={styles.cardSubtitle}>Baseado nas suas metas de orçamento (%)</Text>
          )}

          {pieData.length === 0 ? (
            <Text style={styles.emptyText}>Sem despesas neste período.</Text>
          ) : (
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <PieChart
                donut
                data={pieData}
                innerRadius={60}
                radius={90}
                textColor="white"
                textSize={12}
                showTextBackground
                textBackgroundRadius={14}
              />
            </View>
          )}

          {analyticsData.map((item, index) => {
            if (item.total === 0 && item.name === 'Outros') return null; // Esconder "Outros" se for 0
            
            const actualPercent = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
            const targetPercent = macroTargets[item.name] || 0;
            const diffPercent = actualPercent - targetPercent;
            
            let statusColor = '#888';
            let statusText = '';
            
            if (isMacro && targetPercent > 0 && item.name !== 'Outros') {
              if (item.name.toLowerCase().includes('invest')) {
                if (actualPercent >= targetPercent) {
                  statusColor = '#4CAF50';
                  statusText = `Meta atingida! (+${diffPercent.toFixed(1)}%)`;
                } else {
                  statusColor = '#F44336';
                  statusText = `Abaixo da meta (${Math.abs(diffPercent).toFixed(1)}% faltando)`;
                }
              } else {
                if (actualPercent <= targetPercent) {
                  statusColor = '#4CAF50';
                  statusText = `Dentro da meta (${Math.abs(diffPercent).toFixed(1)}% de sobra)`;
                } else {
                  statusColor = '#F44336';
                  statusText = `Acima do limite (+${diffPercent.toFixed(1)}%)`;
                }
              }
            }

            return (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.catHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={styles.catName}>{item.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.catAmount}>R$ {item.total.toFixed(2)}</Text>
                    <Text style={styles.catPercent}>
                      {isMacro && item.name !== 'Outros' ? `${actualPercent.toFixed(1)}% (Meta: ${targetPercent}%)` : `${actualPercent.toFixed(1)}%`}
                    </Text>
                  </View>
                </View>
                
                {isMacro && targetPercent > 0 && item.name !== 'Outros' && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ color: statusColor, fontSize: 11, fontWeight: 'bold' }}>{statusText}</Text>
                  </View>
                )}

                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(actualPercent, 100)}%`, backgroundColor: item.color }]} />
                  {isMacro && targetPercent > 0 && item.name !== 'Outros' && (
                    <View style={[styles.targetMarker, { left: `${Math.min(targetPercent, 100)}%` }]} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Top 3 Vilões */}
        {uiConfig.analyticsShowVilao !== false && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top 3 Vilões</Text>
            <Text style={styles.cardSubtitle}>As maiores despesas isoladas do período</Text>
            
            <View style={{ marginTop: 16 }}>
              {topExpenses.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>
              ) : (
                topExpenses.map((item, idx) => {
                  const catInfo = categorizeTransaction(item.description, item.amount);
                  return (
                    <View key={item.id} style={styles.vilaoCard}>
                      <Text style={[styles.vilaoRank, { color: accentColor }]}>#{idx + 1}</Text>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.vilaoDesc}>{item.description}</Text>
                        <Text style={styles.vilaoCat}>{catInfo.categoryName}</Text>
                      </View>
                      <Text style={[styles.vilaoAmount, { color: accentColor }]}>- R$ {item.amount.toFixed(2)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL CONFIGURAÇÃO DE METAS E MACROS */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContainerBig}>
            <Text style={styles.modalTitle}>Gerenciar Macros</Text>
            <Text style={styles.modalSub}>Edite nomes, metas ou adicione novos grupos.</Text>
            
            <ScrollView style={{ marginBottom: 16, maxHeight: 250 }}>
              {macroOptions.map(cat => (
                <MacroRow 
                  key={cat} 
                  macro={cat} 
                  target={macroTargets[cat] || 0} 
                  onUpdateName={updateMacroName}
                  onUpdateTarget={updateTarget}
                  onRemove={removeMacro}
                />
              ))}
              
              {/* Adicionar Novo Macro */}
              <View style={styles.addMacroRow}>
                <TextInput
                  style={[styles.goalInput, { flex: 1, textAlign: 'left', marginRight: 12 }]}
                  placeholder="Novo Grupo Macro..."
                  placeholderTextColor="#888"
                  value={newMacroName}
                  onChangeText={setNewMacroName}
                />
                <TouchableOpacity style={styles.iconBtnAdd} onPress={addMacro}>
                  <Ionicons name="add" size={24} color="#121212" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.outlineBtn, { borderColor: accentColor }]} onPress={() => { setShowGoalModal(false); setShowMappingModal(true); }}>
              <Text style={[styles.outlineBtnText, { color: accentColor }]}>Mapear Categorias para os Macros</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={() => setShowGoalModal(false)}>
              <Text style={[styles.saveBtnText, { color: '#121212' }]}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL MAPEAMENTO DE CATEGORIAS */}
      <Modal visible={showMappingModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContainerBig}>
            <Text style={styles.modalTitle}>Mapeamento Macro</Text>
            <Text style={styles.modalSub}>Toque no botão à direita para trocar o grupo macro da categoria.</Text>
            
            <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
              {Object.keys(macroMapping).sort().map(microCat => {
                const currentMacro = macroMapping[microCat];
                const macroIdx = macroOptions.indexOf(currentMacro);
                const macroColor = currentMacro === 'Outros' ? '#888' : COLORS_PALETTE[macroIdx % COLORS_PALETTE.length] || '#888';

                return (
                  <View key={microCat} style={styles.mapRow}>
                    <Text style={styles.mapMicro}>{microCat}</Text>
                    <TouchableOpacity 
                      style={[styles.mapToggleBtn, { borderColor: macroColor }]}
                      onPress={() => cycleMacroMapping(microCat)}
                    >
                      <Text style={[styles.mapToggleText, { color: macroColor }]}>{currentMacro}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={() => setShowMappingModal(false)}>
              <Text style={[styles.saveBtnText, { color: '#121212' }]}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 16, backgroundColor: '#1E1E1E', borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 16 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#2C2C2C' },
  periodBtnActive: { backgroundColor: '#BB86FC' },
  periodText: { color: '#888', fontWeight: 'bold' },
  periodTextActive: { color: '#121212' },
  scroll: { padding: 16 },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center' },
  totalValue: { color: '#F44336', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: '#888', fontSize: 12, marginTop: 4 },
  
  toggleBtn: { backgroundColor: '#2C2C2C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  iconBtn: { backgroundColor: '#2C2C2C', padding: 6, borderRadius: 12, justifyContent: 'center' },
  toggleText: { color: '#BB86FC', fontSize: 12, fontWeight: 'bold' },
  
  categoryRow: { marginBottom: 16 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  catName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  catAmount: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  catPercent: { color: '#888', fontSize: 12 },
  
  progressBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', position: 'relative' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  targetMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', zIndex: 10 },
  
  vilaoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252525', padding: 12, borderRadius: 12, marginBottom: 8 },
  vilaoRank: { color: '#F44336', fontSize: 20, fontWeight: 'bold' },
  vilaoDesc: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  vilaoCat: { color: '#888', fontSize: 12 },
  vilaoAmount: { color: '#F44336', fontSize: 14, fontWeight: 'bold' },
  
  emptyText: { color: '#888', textAlign: 'center', padding: 20 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalContainer: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 24 },
  modalContainerBig: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 24, flex: 0.8 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSub: { color: '#888', fontSize: 14, marginBottom: 24 },
  
  goalInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: '#252525', padding: 8, borderRadius: 12 },
  addMacroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#2C2C2C', padding: 8, borderRadius: 12 },
  goalLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold', flexShrink: 1 },
  goalInput: { backgroundColor: '#333', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 60, textAlign: 'center' },
  iconBtnAdd: { backgroundColor: '#BB86FC', padding: 8, borderRadius: 8 },
  
  mapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  mapMicro: { color: '#fff', fontSize: 14 },
  mapToggleBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  mapToggleText: { fontSize: 12, fontWeight: 'bold' },

  saveBtn: { backgroundColor: '#BB86FC', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  outlineBtn: { borderWidth: 1, borderColor: '#BB86FC', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  outlineBtnText: { color: '#BB86FC', fontWeight: 'bold', fontSize: 14 }
});
