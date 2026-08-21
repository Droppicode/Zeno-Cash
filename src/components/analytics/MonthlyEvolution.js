import React from 'react';
import { View, Text } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function MonthlyEvolution({ theme, bars, line, initiallyExpanded }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => setReady(true), 100);
  }, []);

  if (!bars || bars.length === 0) return null;

  return (
    <CollapsibleSection title="Evolução Mensal" subtitle="Receitas vs Despesas (6 meses)" theme={theme} initiallyExpanded={initiallyExpanded}>
      <View style={{ alignItems: 'center', minHeight: 150 * z }}>
        {ready && (
          <BarChart
            data={bars}
            barWidth={12 * z}
            spacing={16 * z}
            initialSpacing={10 * z}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 * z }}
            xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 * z }}
            labelWidth={40 * z}
            noOfSections={4}
            barBorderRadius={6 * z}
            frontColor="lightgray"
            height={150 * z}
          />
        )}
      </View>
    </CollapsibleSection>
  );
}
