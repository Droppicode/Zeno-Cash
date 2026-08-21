import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function ExpenseComposition({ theme, data, totalExpense, isMacro, setIsMacro, macroTargets }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const pieData = data.filter(i => i.total > 0).map(item => ({
    value: item.total,
    color: item.color,
    text: totalExpense > 0 ? `${((item.total / totalExpense) * 100).toFixed(0)}%` : '0%'
  }));

  return (
    <CollapsibleSection title="Composição" subtitle="Distribuição dos gastos no período" theme={theme}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 * z }}>
        <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setIsMacro(!isMacro)}>
          <Text style={[styles.toggleText, { color: theme.accent, fontFamily: f }]}>{isMacro ? 'Ver Detalhado' : 'Agrupar Macro'}</Text>
        </TouchableOpacity>
      </View>

      {pieData.length === 0 ? (
        <Text style={{ textAlign: 'center', color: theme.textSecondary, fontFamily: f, padding: 20 * z }}>Sem despesas neste período.</Text>
      ) : (
        <View style={{ alignItems: 'center', marginBottom: 24 * z }}>
          <PieChart
            donut
            data={pieData}
            innerRadius={60 * z}
            radius={90 * z}
            textColor="white"
            textSize={12 * z}
            showTextBackground
            textBackgroundRadius={14 * z}
            centerLabelComponent={() => (
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 12 * z, color: theme.textSecondary, fontFamily: f }}>Total</Text>
                <Text style={{ fontSize: 16 * z, color: theme.text, fontWeight: 'bold', fontFamily: f }}>R$ {totalExpense.toFixed(0)}</Text>
              </View>
            )}
          />
        </View>
      )}

      {data.map((item, index) => {
        if (item.total === 0 && item.name === 'Outros') return null; 
        
        const actualPercent = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
        const targetPercent = macroTargets[item.name] || 0;
        const diffPercent = actualPercent - targetPercent;
        
        let statusColor = theme.textSecondary;
        let statusText = '';
        
        if (isMacro && targetPercent > 0 && item.name !== 'Outros') {
          if (item.name.toLowerCase().includes('invest')) {
            if (actualPercent >= targetPercent) {
              statusColor = theme.income;
              statusText = `Meta atingida! (+${diffPercent.toFixed(1)}%)`;
            } else {
              statusColor = theme.expense;
              statusText = `Abaixo da meta (${Math.abs(diffPercent).toFixed(1)}% faltando)`;
            }
          } else {
            if (actualPercent <= targetPercent) {
              statusColor = theme.income;
              statusText = `Dentro da meta (${Math.abs(diffPercent).toFixed(1)}% de sobra)`;
            } else {
              statusColor = theme.expense;
              statusText = `Acima do limite (+${diffPercent.toFixed(1)}%)`;
            }
          }
        }

        return (
          <View key={index} style={styles.categoryRow}>
            <View style={styles.catHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={[styles.catName, { color: theme.text, fontFamily: f }]}>{item.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.catAmount, { color: theme.text, fontFamily: f }]}>R$ {item.total.toFixed(2)}</Text>
                <Text style={[styles.catPercent, { color: theme.textSecondary, fontFamily: f }]}>
                  {isMacro && item.name !== 'Outros' ? `${actualPercent.toFixed(1)}% (Meta: ${targetPercent}%)` : `${actualPercent.toFixed(1)}%`}
                </Text>
              </View>
            </View>
            
            {isMacro && targetPercent > 0 && item.name !== 'Outros' && (
              <View style={{ marginBottom: 6 }}>
                <Text style={{ color: statusColor, fontSize: 11, fontWeight: 'bold' }}>{statusText}</Text>
              </View>
            )}

            <View style={[styles.progressBarBg, { backgroundColor: theme.cardSecondary }]}>
              <View style={[styles.progressBarFill, { width: `${Math.min(actualPercent, 100)}%`, backgroundColor: item.color }]} />
              {isMacro && targetPercent > 0 && item.name !== 'Outros' && (
                <View style={[styles.targetMarker, { left: `${Math.min(targetPercent, 100)}%` }]} />
              )}
            </View>
          </View>
        );
      })}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  toggleText: { fontSize: 12, fontWeight: 'bold' },
  categoryRow: { marginBottom: 16 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  catName: { fontSize: 14, fontWeight: 'bold' },
  catAmount: { fontSize: 14, fontWeight: 'bold' },
  catPercent: { fontSize: 12 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  targetMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', zIndex: 10 }
});
