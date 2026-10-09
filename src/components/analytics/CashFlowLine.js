import React from 'react';
import { Dimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';
import { downsample, fitSpacing, formatCompactYLabel, limitDataPointLabels, lineScale, sanitizeSeries } from '../../utils/chartSafety';

export default function CashFlowLine({ theme, series }) {
  const z = getZoomFactor(theme);

  if (!Array.isArray(series) || series.length === 0) return null;

  const safeSeries = limitDataPointLabels(downsample(sanitizeSeries(series)));
  const { yAxisOffset, maxValue } = lineScale(safeSeries.map(point => point.value));
  const chartWidth = Dimensions.get('window').width - 64 * z;

  return (
    <CollapsibleSection title="Fluxo de Caixa" subtitle="Evolução do saldo ao longo do período" theme={theme}>
      <View style={{ alignItems: 'center' }}>
        <LineChart
          data={safeSeries}
          color={theme.accent}
          spacing={fitSpacing(safeSeries.length, chartWidth)}
          thickness={3 * z}
          dataPointsColor={theme.accent}
          dataPointsRadius={4 * z}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 * z }}
          xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 * z }}
          maxValue={maxValue}
          yAxisOffset={yAxisOffset}
          formatYLabel={formatCompactYLabel}
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
