import React, { useState, useEffect, useRef } from 'react';
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
  style,
  inputStyle,
  excludeItems = [],
  ...rest
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeout = useRef(null);
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const refresh = async (text) => {
    if (!fetchSuggestions) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalizedText = text.toLowerCase();
    const normalizedExcluded = excludeItems.map(item => item?.toLowerCase());
    const items = await fetchSuggestions();
    const filtered = items.filter(item => {
      const normalizedItem = item.toLowerCase();
      return normalizedItem.includes(normalizedText) &&
        normalizedItem !== normalizedText &&
        !normalizedExcluded.includes(normalizedItem);
    });
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleChange = async (text) => {
    onChangeText(text);
    await refresh(text);
  };

  const handleSelect = (item) => {
    onChangeText(item);
    if (onSelect) onSelect(item);
    setShowSuggestions(false);
  };

  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    };
  }, []);

  const styles = StyleSheet.create({
    inputGroup: { marginBottom: 20 * z, zIndex: 1 },
    label: { fontSize: 14 * z, color: theme.textSecondary, marginBottom: 8 * z, fontWeight: '600', fontFamily: f },
    input: { backgroundColor: theme.background, borderRadius: 6 * z, padding: 16 * z, fontSize: 16 * z, color: theme.text, fontFamily: f },
    suggestionsContainer: { backgroundColor: theme.cardSecondary, borderRadius: 4 * z, marginTop: 4 * z, maxHeight: 120 * z, zIndex: 2 },
    suggestionItem: { padding: 12 * z, borderBottomWidth: 1, borderBottomColor: theme.background },
    suggestionText: { color: theme.text, fontSize: 14 * z, fontFamily: f }
  });

  return (
    <View style={[styles.inputGroup, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...rest}
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => refresh(value || '')}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
        }}
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
