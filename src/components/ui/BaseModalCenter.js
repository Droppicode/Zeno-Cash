import React, { useContext, useMemo, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView, Animated } from 'react-native';
import { SettingsContext } from '../../context/SettingsContext';
import { getZoomFactor } from '../../utils/scaler';

export default function BaseModalCenter({ 
  visible, 
  title, 
  onClose, 
  onSave, 
  children, 
  saveText = 'Salvar', 
  cancelText = 'Cancelar',
  showActions = true,
  errorMsg = '',
  saveDisabled = false
}) {
  const { activeTheme } = useContext(SettingsContext);
  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';

  const styles = useMemo(() => StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 * z },
    modalContent: { borderRadius: 20 * z, padding: 24 * z, maxHeight: '90%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    modalTitle: { fontSize: 20 * z, fontWeight: 'bold', marginBottom: 16 * z, fontFamily: f },
    modalActions: { flexDirection: 'row', gap: 12 * z, marginTop: 24 * z, justifyContent: 'flex-end' },
    btnCancel: { paddingHorizontal: 16 * z, paddingVertical: 12 * z, borderRadius: 12 * z, justifyContent: 'center' },
    btnSave: { paddingHorizontal: 20 * z, paddingVertical: 12 * z, borderRadius: 12 * z, justifyContent: 'center' },
    btnTextCancel: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
    btnTextSave: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
    errorText: { color: activeTheme.expense, marginBottom: 12 * z, fontWeight: 'bold', fontFamily: f }
  }), [z, f, activeTheme]);

  const [renderModal, setRenderModal] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.95)).current;

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true })
      ]).start(() => setRenderModal(false));
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Modal visible={renderModal} animationType="none" transparent={true} onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); if (onClose) onClose(); }}>
            <Animated.View style={[styles.modalContent, { backgroundColor: activeTheme.card, transform: [{ scale: scaleAnim }] }]}>
              {title && <Text style={[styles.modalTitle, { color: activeTheme.text }]}>{title}</Text>}
            
            {!!errorMsg && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>

            {showActions && (
              <View style={styles.modalActions}>
                {onClose && (
                  <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
                    <Text style={[styles.btnTextCancel, { color: activeTheme.textSecondary }]}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                {onSave && (
                  <TouchableOpacity 
                    style={[styles.btnSave, { backgroundColor: activeTheme.accent, opacity: saveDisabled ? 0.5 : 1 }]} 
                    onPress={saveDisabled ? undefined : onSave}
                    disabled={saveDisabled}
                  >
                    <Text style={[styles.btnTextSave, { color: '#121212' }]}>{saveText}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
