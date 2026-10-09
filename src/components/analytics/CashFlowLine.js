import React from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function CashFlowLine({ theme, series }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  if (!series || series.length === 0) return null;

  const maxVal = Math.max(...series.map(s => s.value), 0);
  const minVal = Math.min(...series.map(s => s.value), 0);
  const range = Math.max(maxVal - minVal, 1);
  const pad = range * 0.1;
  const yAxisOffset = Math.floor(minVal - pad);
  const chartMaxValue = Math.ceil(maxVal + pad - yAxisOffset);

  return (
    <CollapsibleSection title="Fluxo de Caixa" subtitle="Evolução do saldo ao longo do período" theme={theme}>
      <View style={{ alignItems: 'center' }}>
        <LineChart
          data={series}
          color={theme.accent}
          thickness={3 * z}
          dataPointsColor={theme.accent}
          dataPointsRadius={4 * z}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 * z }}
          xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 * z }}
          maxValue={chartMaxValue}
          yAxisOffset={yAxisOffset}
          noOfSections={4}
          areaChart
          startFillColor={theme.accent}
          startOpacity={0.3}
          endFillColor={theme.accent}
          endOpacity={0.0}
          height={160 * z}
          isAnimated
        />
      </View>
    </CollapsibleSection>
  );
}
