import { StyleSheet } from 'react-native';
import { getZoomFactor } from './scaler';

export const getSharedStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderBottomWidth: 1 },
    backBtn: { width: 40 * z, height: 40 * z, justifyContent: 'center' },
    title: { fontSize: 20 * z, fontWeight: 'bold', fontFamily: f },
    scroll: { padding: 16 * z },
    
    // Shared Form Elements
    label: { fontSize: 14 * z, fontWeight: 'bold', marginBottom: 8 * z, marginTop: 12 * z, fontFamily: f },
    input: { padding: 16 * z, borderRadius: 12 * z, fontSize: 16 * z, marginBottom: 4 * z, fontFamily: f },
    
    pickerRow: { flexDirection: 'row', gap: 12 * z, marginBottom: 4 * z, flexWrap: 'wrap' },
    pickerItem: { width: 44 * z, height: 44 * z, borderRadius: 22 * z, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    colorItem: { width: 36 * z, height: 36 * z, borderRadius: 18 * z },
    
    // Buttons
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 * z, borderRadius: 12 * z, borderWidth: 1, borderStyle: 'dashed', marginTop: 12 * z },
    addBtnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    
    actionBtn: { width: 36 * z, height: 36 * z, justifyContent: 'center', alignItems: 'center', marginLeft: 4 * z },
    
    // Switch row
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 * z, borderBottomWidth: 1 },
    switchLabel: { fontSize: 16 * z, fontFamily: f },

    // Pill
    pill: { paddingHorizontal: 16 * z, paddingVertical: 8 * z, borderRadius: 20 * z, marginRight: 8 * z },
    pillText: { fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },

    // Shared List
    listContent: { padding: 16 * z, paddingBottom: 40 * z },
    sectionHeader: { fontSize: 16 * z, fontWeight: '700', marginTop: 12 * z, marginBottom: 12 * z, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: f },
    emptyText: { textAlign: 'center', marginTop: 40 * z, fontSize: 16 * z, fontFamily: f },
  });
};
