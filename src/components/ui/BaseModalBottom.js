import React, { useContext, useMemo } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import { SettingsContext } from '../../context/SettingsContext';
import { getZoomFactor } from '../../utils/scaler';

export default function BaseModalBottom({ 
  visible, 
  title, 
  onClose, 
  onSave, 
  children, 
  saveText = 'Salvar', 
  cancelText = 'Cancelar',
  showActions = true,
  errorMsg = '',
  saveDisabled = false,
  headerRight,
  footerComponent
}) {
  const { activeTheme } = useContext(SettingsContext);
  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';

  const styles = useMemo(() => StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24 * z, borderTopRightRadius: 24 * z, padding: 24 * z, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 * z },
    modalTitle: { fontSize: 22 * z, fontWeight: 'bold', fontFamily: f },
    modalActions: { flexDirection: 'row', gap: 12 * z, marginTop: 32 * z },
    btnCancel: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
    btnSave: { flex: 1, padding: 16 * z, borderRadius: 12 * z, alignItems: 'center' },
    btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    errorText: { color: activeTheme.expense, marginBottom: 12 * z, fontWeight: 'bold', fontFamily: f }
  }), [z, f, activeTheme]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); if (onClose) onClose(); }}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: activeTheme.card }]}>
            {(title || headerRight) && (
              <View style={styles.header}>
                {title ? <Text style={[styles.modalTitle, { color: activeTheme.text }]}>{title}</Text> : <View />}
                {headerRight && headerRight}
              </View>
            )}
            
            {!!errorMsg && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>

            {footerComponent ? footerComponent : (
              showActions && (
                <View style={styles.modalActions}>
                  {onClose && (
                    <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={onClose}>
                      <Text style={[styles.btnText, { color: activeTheme.text }]}>{cancelText}</Text>
                    </TouchableOpacity>
                  )}
                  {onSave && (
                    <TouchableOpacity 
                      style={[styles.btnSave, { backgroundColor: activeTheme.accent, opacity: saveDisabled ? 0.5 : 1 }]} 
                      onPress={saveDisabled ? undefined : onSave}
                      disabled={saveDisabled}
                    >
                      <Text style={[styles.btnText, { color: '#121212' }]}>{saveText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
