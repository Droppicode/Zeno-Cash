import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import BaseModalBottom from '../ui/BaseModalBottom';
import { getZoomFactor } from '../../utils/scaler';

export default function WeeklyHeatmap({ theme, data }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  if (!data || data.length === 0) return null;

  // Organizar dados em semanas e dias da semana
  // data = [{ date: timestamp, total: amount }, ...] ordenado
  const weeks = [];
  let currentWeek = [];
  
  data.forEach((day, index) => {
    const d = new Date(day.date);
    const dayOfWeek = d.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Se for o primeiro dia do array, preenche os dias anteriores da semana com null
    if (index === 0 && dayOfWeek > 0) {
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push(null);
      }
    }
    
    currentWeek.push(day);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
     while(currentWeek.length < 7) {
         currentWeek.push(null);
     }
     weeks.push(currentWeek);
  }

  // Achar o valor máximo para a escala de cores
  const maxTotal = Math.max(...data.map(d => d.total));

  const getIntensityColor = (total) => {
    if (total === 0) return theme.cardSecondary;
    const intensity = Math.min(1, total / (maxTotal || 1));
    // Blend de cardSecondary para expense color
    return theme.expense;
  };

  const getOpacity = (total) => {
    if (total === 0) return 1;
    return Math.max(0.2, Math.min(1, total / (maxTotal || 1)));
  }

  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <CollapsibleSection title="Heatmap de Gastos" subtitle="Intensidade de despesas por dia" theme={theme}>
      <View style={{ flexDirection: 'row', marginBottom: 8 * z }}>
        {daysOfWeek.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: theme.textSecondary, fontFamily: f, flex: 1, textAlign: 'center' }]}>{d}</Text>
        ))}
      </View>
      
      {weeks.map((week, wIndex) => (
        <View key={wIndex} style={{ flexDirection: 'row', marginBottom: 4 * z }}>
          {week.map((day, dIndex) => {
             if (!day) return <View key={dIndex} style={{ flex: 1, margin: 2 * z }} />;
             
             return (
               <TouchableOpacity 
                  key={dIndex} 
                  onPress={() => setSelectedDay(day)}
                  style={{ 
                    flex: 1, 
                    aspectRatio: 1, 
                    margin: 2 * z, 
                    borderRadius: 4 * z,
                    backgroundColor: getIntensityColor(day.total),
                    opacity: getOpacity(day.total)
                  }} 
               />
             );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 * z, gap: 8 * z }}>
         <Text style={{ fontSize: 10 * z, color: theme.textSecondary, fontFamily: f }}>Menos</Text>
         <View style={{ width: 12 * z, height: 12 * z, borderRadius: 2 * z, backgroundColor: theme.cardSecondary }} />
         <View style={{ width: 12 * z, height: 12 * z, borderRadius: 2 * z, backgroundColor: theme.expense, opacity: 0.5 }} />
         <View style={{ width: 12 * z, height: 12 * z, borderRadius: 2 * z, backgroundColor: theme.expense }} />
         <Text style={{ fontSize: 10 * z, color: theme.textSecondary, fontFamily: f }}>Mais</Text>
      </View>

      <BaseModalBottom
        visible={!!selectedDay}
        title={selectedDay ? `Gastos: ${new Date(selectedDay.date).toLocaleDateString('pt-BR')}` : ''}
        onClose={() => setSelectedDay(null)}
        cancelText="Fechar"
      >
         <View style={{ maxHeight: 300 * z }}>
            {!selectedDay || selectedDay.txList.length === 0 ? (
               <Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 20 * z, fontFamily: f }}>Nenhum gasto neste dia.</Text>
            ) : (
               selectedDay.txList.map(tx => (
                 <View key={tx.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 * z, borderBottomWidth: 1, borderBottomColor: theme.cardSecondary }}>
                    <View style={{ flex: 1, paddingRight: 12 * z }}>
                        <Text style={{ color: theme.text, fontSize: 14 * z, fontWeight: 'bold', fontFamily: f }} numberOfLines={1}>{tx.description}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 * z, fontFamily: f }}>{new Date(tx.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</Text>
                    </View>
                    <Text style={{ color: theme.expense, fontSize: 14 * z, fontWeight: 'bold', fontFamily: f }}>- R$ {tx.amount.toFixed(2)}</Text>
                 </View>
               ))
            )}
         </View>
      </BaseModalBottom>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  dayLabel: {
    fontSize: 12,
    fontWeight: 'bold'
  }
});
