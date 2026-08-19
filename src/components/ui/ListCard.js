import React, { useContext } from 'react';
import { View } from 'react-native';
import { SettingsContext } from '../../context/SettingsContext';
import { getZoomFactor } from '../../utils/scaler';

export default function ListCard({ index, total, children, style }) {
  const { activeTheme } = useContext(SettingsContext);
  const z = getZoomFactor(activeTheme);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <View style={[
      { 
        backgroundColor: activeTheme.cardSecondary,
        padding: 16 * z, 
        marginBottom: 12 * z,
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      },
      isFirst && { borderTopLeftRadius: 16 * z, borderTopRightRadius: 16 * z },
      isLast && { borderBottomLeftRadius: 16 * z, borderBottomRightRadius: 16 * z },
      !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background, marginBottom: 0 },
      style
    ]}>
      {children}
    </View>
  );
}
