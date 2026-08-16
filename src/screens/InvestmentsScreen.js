import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function InvestmentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Investimentos</Text>
      <Text style={styles.subtitle}>Ativos e Projeções (Em breve)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    marginTop: 8,
  }
});
