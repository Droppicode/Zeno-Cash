import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SectionList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/db';
import { transactions } from '../database/schema';
import { desc } from 'drizzle-orm';
import { categorizeTransaction } from '../services/categorizer';

export default function TransactionsScreen() {
  const [txList, setTxList] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, income, expense
  const [period, setPeriod] = useState('30d'); // 30d, 90d, all
  
  // Advanced Filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCats, setSelectedCats] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    try {
      const data = await db.select().from(transactions).orderBy(desc(transactions.date));
      setTxList(data);
    } catch (err) {
      console.log('Erro db:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const parseDateStr = (dateStr) => {
    if (dateStr.length !== 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
  };

  const filteredList = txList.filter(item => {
    // 1. Filtro de Período Rápido
    const now = new Date().getTime();
    if (period === '30d' && item.date < now - (30 * 24 * 60 * 60 * 1000)) return false;
    if (period === '90d' && item.date < now - (90 * 24 * 60 * 60 * 1000)) return false;

    // 2. Filtro de Tipo
    if (filter === 'income' && item.type !== 'income') return false;
    if (filter === 'expense' && item.type !== 'expense') return false;
    
    // 3. Filtro de Categorias Múltiplas
    const catInfo = categorizeTransaction(item.description, item.amount);
    if (selectedCats.length > 0 && !selectedCats.includes(catInfo.categoryName)) {
      return false;
    }
    
    // 4. Filtro de Busca
    if (search.trim() !== '' && !item.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // 5. Filtro de Datas Customizadas
    if (startDate.length === 10) {
      const sDate = parseDateStr(startDate);
      if (sDate && item.date < sDate) return false;
    }
    
    if (endDate.length === 10) {
      const eDate = parseDateStr(endDate);
      if (eDate && item.date > (eDate + 86400000)) return false; // Inclui o final do dia
    }

    return true;
  });

  // Extrair categorias únicas de TODOS os itens (para montar a UI)
  const uniqueCategories = Array.from(new Set(txList.map(item => categorizeTransaction(item.description, item.amount).categoryName)));

  const toggleCategory = (cat) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter(c => c !== cat));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const formatDateInput = (text) => {
    let v = text.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    if (v.length >= 3) return `${v.slice(0,2)}/${v.slice(2)}`;
    return v;
  };

  const groupedData = filteredList.reduce((acc, tx) => {
    const d = new Date(tx.date);
    const monthYear = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const key = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const sections = Object.keys(groupedData).map(key => ({
    title: key,
    data: groupedData[key]
  }));

  const renderItem = ({ item }) => {
    const catInfo = categorizeTransaction(item.description, item.amount);
    const dateStr = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: catInfo.color + '20' }]}>
            <Ionicons name={catInfo.icon} size={20} color={catInfo.color} />
          </View>
          <View>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.date}>{dateStr} • {catInfo.categoryName}</Text>
          </View>
        </View>
        <Text style={[
          styles.amount, 
          { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
        ]}>
          {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar transação..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
            {/* Tipos */}
            <View style={styles.filterGroup}>
              <TouchableOpacity style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]} onPress={() => setFilter('all')}>
                <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tudo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'income' && styles.filterBtnActive]} onPress={() => setFilter('income')}>
                <Text style={[styles.filterText, filter === 'income' && styles.filterTextActive]}>Receitas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'expense' && styles.filterBtnActive]} onPress={() => setFilter('expense')}>
                <Text style={[styles.filterText, filter === 'expense' && styles.filterTextActive]}>Despesas</Text>
              </TouchableOpacity>
            </View>
            
            {/* Tempos */}
            <View style={styles.filterGroup}>
              <TouchableOpacity style={[styles.periodBtn, period === '30d' && styles.periodBtnActive]} onPress={() => setPeriod('30d')}>
                <Text style={[styles.periodText, period === '30d' && styles.periodTextActive]}>30D</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.periodBtn, period === '90d' && styles.periodBtnActive]} onPress={() => setPeriod('90d')}>
                <Text style={[styles.periodText, period === '90d' && styles.periodTextActive]}>90D</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.periodBtn, period === 'all' && styles.periodBtnActive]} onPress={() => setPeriod('all')}>
                <Text style={[styles.periodText, period === 'all' && styles.periodTextActive]}>Sempre</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Botão Fixo à Direita para Filtros Avançados */}
          <TouchableOpacity style={styles.advancedToggleBtn} onPress={() => setShowAdvanced(!showAdvanced)}>
            <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={20} color="#BB86FC" />
          </TouchableOpacity>
        </View>

        {showAdvanced && (
          <View style={styles.advancedPanel}>
            <Text style={styles.advancedTitle}>Filtros Específicos</Text>
            
            {/* Filtro de Data */}
            <View style={styles.dateInputsRow}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Data Inicial</Text>
                <TextInput 
                  style={styles.dateInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  value={startDate}
                  onChangeText={(text) => setStartDate(formatDateInput(text))}
                  maxLength={10}
                />
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Data Final</Text>
                <TextInput 
                  style={styles.dateInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  value={endDate}
                  onChangeText={(text) => setEndDate(formatDateInput(text))}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Categorias (Múltipla Escolha) */}
            <Text style={styles.dateLabel}>Categorias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScrollContent}>
              {uniqueCategories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catBtn, selectedCats.includes(cat) && styles.catBtnActive]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.catText, selectedCats.includes(cat) && styles.catTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </View>

      <SectionList 
        sections={sections}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 16, backgroundColor: '#1E1E1E', borderBottomWidth: 1, borderBottomColor: '#333' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  
  filterContainer: { flexDirection: 'row', alignItems: 'center' },
  filterScroll: { flex: 1, marginRight: 8 },
  filterScrollContent: { gap: 8, paddingBottom: 4 },
  
  filterGroup: { flexDirection: 'row', backgroundColor: '#2C2C2C', borderRadius: 20, padding: 4, alignItems: 'center' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  filterBtnActive: { backgroundColor: '#BB86FC' },
  filterText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  filterTextActive: { color: '#121212' },
  
  periodBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  periodBtnActive: { backgroundColor: '#BB86FC' },
  periodText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  periodTextActive: { color: '#121212' },
  
  advancedToggleBtn: { width: 40, height: 40, backgroundColor: '#2C2C2C', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  advancedPanel: { marginTop: 16, padding: 12, backgroundColor: '#252525', borderRadius: 12 },
  advancedTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 12 },
  dateInputsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateInputContainer: { flex: 1 },
  dateLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  dateInput: { backgroundColor: '#333', color: '#fff', padding: 10, borderRadius: 8 },
  
  catScrollContent: { gap: 8, flexDirection: 'row' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#333' },
  catBtnActive: { backgroundColor: '#BB86FC' },
  catText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  catTextActive: { color: '#121212' },
  
  listContent: { padding: 16 },
  sectionHeader: { color: '#BB86FC', fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  desc: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  date: { color: '#888', fontSize: 12 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 16 }
});
