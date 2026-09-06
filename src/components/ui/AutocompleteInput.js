import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { getZoomFactor } from '../../utils/scaler';

export default function AutocompleteInput({
  value,
  onChangeText,
  onSelect,
  fetchSuggestions,
  theme,
  label,
  placeholder,
  style
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const handleChange = async (text) => {
    onChangeText(text);
    if (text.length > 0 && fetchSuggestions) {
      const items = await fetchSuggestions();
      const filtered = items.filter(n => n.toLowerCase().includes(text.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (item) => {
    onChangeText(item);
    if (onSelect) onSelect(item);
    setShowSuggestions(false);
  };

  const styles = StyleSheet.create({
    inputGroup: { marginBottom: 20 * z, zIndex: 1 },
    label: { fontSize: 14 * z, color: theme.textSecondary, marginBottom: 8 * z, fontWeight: '600', fontFamily: f },
    input: { backgroundColor: theme.background, borderRadius: 12 * z, padding: 16 * z, fontSize: 16 * z, color: theme.text, fontFamily: f },
    suggestionsContainer: { backgroundColor: theme.cardSecondary, borderRadius: 8 * z, marginTop: 4 * z, maxHeight: 120 * z, zIndex: 2 },
    suggestionItem: { padding: 12 * z, borderBottomWidth: 1, borderBottomColor: theme.background },
    suggestionText: { color: theme.text, fontSize: 14 * z, fontFamily: f }
  });

  return (
    <View style={[styles.inputGroup, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
      />
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelect(item)}>
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
