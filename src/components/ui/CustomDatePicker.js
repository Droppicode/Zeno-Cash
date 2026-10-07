import React, { useState } from 'react';
import { Platform, TouchableOpacity, View, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../../utils/scaler';
import { DateUtils } from '../../utils/dateUtils';

export default function CustomDatePicker({ 
  value, 
  onChange, 
  theme,
  style,
  placeholder = 'Selecionar...',
  onClear
}) {
  const [showPicker, setShowPicker] = useState(false);
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const handleChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  if (Platform.OS === 'web') {
    const toInputValue = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
    return (
      <View style={[{ backgroundColor: theme.background, borderRadius: 6 * z, padding: 12 * z, flexDirection: 'row', alignItems: 'center' }, style]}>
        {React.createElement('input', {
          type: 'date',
          value: toInputValue(value),
          onChange: (e) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            if (y && m && d) onChange(new Date(y, m - 1, d, 12));
          },
          style: { flex: 1, background: 'transparent', border: 'none', color: theme.text, fontSize: 16 * z, fontFamily: f, colorScheme: theme.card === '#121212' ? 'dark' : 'light' },
        })}
        {value && onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18 * z} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value || new Date()}
        mode="date"
        display="default"
        onChange={handleChange}
        themeVariant={theme.card === '#121212' ? 'dark' : 'light'}
        style={[{ alignSelf: 'flex-start', marginTop: 4 * z }, style]}
      />
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={[{ backgroundColor: theme.background, borderRadius: 6 * z, padding: 16 * z, justifyContent: 'center' }, style]}
        onPress={() => setShowPicker(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: value ? theme.text : theme.textSecondary, fontSize: 16 * z, fontFamily: f }}>
            {value ? DateUtils.formatShortDate(value) : placeholder}
          </Text>
          {value && onClear ? (
            <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18 * z} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="calendar-outline" size={20 * z} color={theme.accent} />
          )}
        </View>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </>
  );
}
