import React, { useContext, useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SettingsContext } from '../../context/SettingsContext';
import { ExtractionContext } from '../../context/ExtractionContext';
import { getZoomFactor } from '../../utils/scaler';

export default function ExtractionBanner() {
  const { activeTheme } = useContext(SettingsContext);
  const { status, progressMessage, errorMessage, extractedData, resetExtraction } = useContext(ExtractionContext);
  const navigation = useNavigation();
  
  const slideAnim = useRef(new Animated.Value(-150)).current;

  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';

  useEffect(() => {
    if (status !== 'idle') {
      Animated.spring(slideAnim, {
        toValue: 50, // desce do topo
        useNativeDriver: true,
        bounciness: 4
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [status, slideAnim]);

  if (status === 'idle') return null;

  const handlePress = () => {
    if (status === 'success' && extractedData) {
      // Navega para revisão e reseta banner
      navigation.navigate('ExtractionReview', { transactions: extractedData });
      resetExtraction();
    }
  };

  const handleClose = () => {
    resetExtraction();
  };

  let iconName = "document-text-outline";
  let iconColor = activeTheme.textSecondary;
  let borderColor = activeTheme.cardSecondary;
  let title = "Processando Extrato";
  let subtitle = progressMessage;

  if (status === 'uploading') {
    iconName = "cloud-upload-outline";
    iconColor = activeTheme.accent;
    borderColor = activeTheme.accent + '50';
  } else if (status === 'processing') {
    iconName = "sparkles-outline";
    iconColor = activeTheme.accent;
    borderColor = activeTheme.accent + '50';
  } else if (status === 'success') {
    iconName = "checkmark-circle";
    iconColor = activeTheme.income;
    borderColor = activeTheme.income;
    title = "Pronto para Revisão!";
    subtitle = "Toque aqui para verificar as transações.";
  } else if (status === 'error') {
    iconName = "alert-circle";
    iconColor = activeTheme.expense;
    borderColor = activeTheme.expense;
    title = "Erro na Extração";
    subtitle = errorMessage;
  }

  const isClickable = status === 'success';

  return (
    <Animated.View style={[
      styles.container, 
      { 
        transform: [{ translateY: slideAnim }],
        backgroundColor: activeTheme.card,
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 16 * z
      }
    ]}>
      <TouchableOpacity 
        style={styles.inner} 
        activeOpacity={isClickable ? 0.7 : 1}
        onPress={isClickable ? handlePress : undefined}
      >
        <Ionicons name={iconName} size={28 * z} color={iconColor} style={{ marginRight: 16 * z }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: activeTheme.text, fontFamily: f, fontSize: 14 * z }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: activeTheme.textSecondary, fontFamily: f, fontSize: 12 * z }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        
        {status === 'error' || status === 'success' ? (
          <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={20 * z} color={activeTheme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
});
