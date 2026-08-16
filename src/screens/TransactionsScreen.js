import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/db';
import { transactions } from '../database/schema';
import { desc } from 'drizzle-orm';
import { categorizeTransaction } from '../services/categorizer';

export default function TransactionsScreen() {
  const [txList, setTxList] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, income, expense

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

  const filteredList = txList.filter(item => {
    // Filtro de tipo
    if (filter === 'income' && item.type !== 'income') return false;
    if (filter === 'expense' && item.type !== 'expense') return false;
    
    // Filtro de texto
    if (search.trim() !== '') {
      if (!item.description.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

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
          { color: item.type === 'income' ? '#4CAF50' : '#fff' }
        ]}>
          {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header com Busca */}
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
        
        {/* Filtros */}
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === 'income' && styles.filterBtnActive]}
            onPress={() => setFilter('income')}
          >
            <Text style={[styles.filterText, filter === 'income' && styles.filterTextActive]}>Receitas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === 'expense' && styles.filterBtnActive]}
            onPress={() => setFilter('expense')}
          >
            <Text style={[styles.filterText, filter === 'expense' && styles.filterTextActive]}>Despesas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      <FlatList 
        data={filteredList}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2C',
  },
  filterBtnActive: {
    backgroundColor: '#BB86FC',
  },
  filterText: {
    color: '#888',
    fontWeight: 'bold',
  },
  filterTextActive: {
    color: '#121212',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  desc: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
