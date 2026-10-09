import { Platform, StyleSheet } from 'react-native';

const getStyles = (z, f, theme) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', ...(Platform.OS === 'web' ? { alignItems: 'center' } : {}) },
  modalContent: { borderTopLeftRadius: 8 * z, borderTopRightRadius: 8 * z, padding: 24 * z, maxHeight: '90%', ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 390 } : {}) },
  modalTitle: { fontSize: 22 * z, fontWeight: 'bold', marginBottom: 20 * z, fontFamily: f },

  toggleContainer: { flexDirection: 'row', borderRadius: 6 * z, overflow: 'hidden', marginBottom: 20 * z },
  toggleBtn: { flex: 1, paddingVertical: 12 * z, alignItems: 'center' },
  toggleText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },

  inputAmount: { fontSize: 40 * z, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 * z, fontFamily: f },

  selectorBlock: { marginBottom: 16 * z },
  label: { fontSize: 14 * z, fontWeight: 'bold', marginBottom: 8 * z, fontFamily: f },

  pill: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 8 * z, marginRight: 8 * z },
  pillText: { fontSize: 14 * z, fontFamily: f },

  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 * z, paddingVertical: 6 * z, borderRadius: 8 * z, borderWidth: 1, marginRight: 8 * z },
  catPillText: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },

  inputField: { padding: 16 * z, borderRadius: 6 * z, fontSize: 16 * z, marginBottom: 12 * z, fontFamily: f },

  modalActions: { flexDirection: 'row', gap: 12 * z, marginTop: 16 * z },
  btnCancel: { flex: 1, padding: 16 * z, borderRadius: 6 * z, alignItems: 'center' },
  btnSave: { flex: 1, padding: 16 * z, borderRadius: 6 * z, alignItems: 'center' },
  btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  deleteButton: { flex: 1, backgroundColor: theme?.expense ? theme.expense + '15' : '#FF4B4B15', padding: 16 * z, borderRadius: 6 * z, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 8 * z },
  deleteButtonText: { color: theme?.expense || '#FF4B4B', fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
  clearBtn: { padding: 12 * z, marginLeft: 8 * z, justifyContent: 'center', alignItems: 'center' },
  recurrenceBox: { padding: 16 * z, borderRadius: 6 * z, marginBottom: 16 * z },
  splitRow: { padding: 12 * z, borderRadius: 6 * z, marginBottom: 12 * z },
  groupChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * z },
  groupChip: { flexDirection: 'row', alignItems: 'center', gap: 4 * z, borderWidth: 1, borderRadius: 14 * z, paddingHorizontal: 10 * z, paddingVertical: 7 * z }
});

export default getStyles;
