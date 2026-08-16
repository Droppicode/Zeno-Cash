import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/db';
import { transactions } from '../database/schema';
import { categorizeTransaction } from '../services/categorizer';

export default function AnalyticsScreen() {
  const [analyticsData, setAnalyticsData] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);

  const loadData = async () => {
    try {
      const data = await db.select().from(transactions);
      
      // Filtra apenas despesas para a análise
      const expenses = data.filter(t => t.type === 'expense');
      
      let sum = 0;
      const grouped = {};

      expenses.forEach(tx => {
        sum += tx.amount;
        const catInfo = categorizeTransaction(tx.description, tx.amount);
        const catName = catInfo.categoryName;
        
        if (!grouped[catName]) {
          grouped[catName] = {
            name: catName,
            total: 0,
            icon: catInfo.icon,
            color: catInfo.color,
          };
        }
        grouped[catName].total += tx.amount;
      });

      // Ordenar por maior gasto
      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
      
      setTotalExpense(sum);
      setAnalyticsData(sorted);
    } catch (err) {
      console.log('Erro db:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Análise de Despesas</Text>
        <Text style={styles.subtitle}>Gasto Total do Período</Text>
        <Text style={styles.totalValue}>R$ {totalExpense.toFixed(2)}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Composição por Categoria</Text>

          {analyticsData.length === 0 ? (
            <Text style={styles.emptyText}>Sem despesas registradas ainda.</Text>
          ) : (
            analyticsData.map((item, index) => {
              const percentage = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
              
              return (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.catHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={item.icon} size={18} color={item.color} style={{ marginRight: 8 }} />
                      <Text style={styles.catName}>{item.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.catAmount}>R$ {item.total.toFixed(2)}</Text>
                      <Text style={styles.catPercent}>{percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                  
                  {/* Barra de Progresso Visual */}
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${percentage}%`, backgroundColor: item.color }
                      ]} 
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
  },
  totalValue: {
    color: '#F44336',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  categoryRow: {
    marginBottom: 20,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  catAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  catPercent: {
    color: '#888',
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  }
});
