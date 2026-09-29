import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseModalBottom from './ui/BaseModalBottom';
import GroupModal from './GroupModal';
import { getZoomFactor } from '../utils/scaler';

export default function GroupPickerModal({
  visible,
  theme,
  groups = [],
  initialSelectedIds,
  mode = 'add',
  onClose,
  onConfirm,
  onCreateGroup
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const z = getZoomFactor(theme);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const initialKey = (initialSelectedIds || []).join(',');
  useEffect(() => {
    if (visible) setSelectedIds(initialKey ? initialKey.split(',').map(Number) : []);
  }, [visible, initialKey]);

  const toggle = id => {
    setSelectedIds(current => current.includes(id)
      ? current.filter(value => value !== id)
      : [...current, id]);
  };

  const handleCreated = async (id, data) => {
    const createdId = await onCreateGroup?.(id, data);
    if (createdId) {
      setSelectedIds(current => [...new Set([...current, Number(createdId)])]);
    }
    setGroupModalVisible(false);
  };

  return (
    <>
      <BaseModalBottom
        visible={visible}
        title={mode === 'remove' ? 'Remover de grupo' : 'Adicionar a grupo'}
        theme={theme}
        onClose={onClose}
        onSave={() => onConfirm(selectedIds)}
        saveText="Confirmar"
        saveDisabled={selectedIds.length === 0}
      >
        <ScrollView horizontal={false} contentContainerStyle={styles.list}>
          {groups.map(group => {
            const selected = selectedIds.includes(Number(group.id));
            const color = group.color || theme.accent;
            return (
              <TouchableOpacity
                key={group.id}
                style={[styles.chip, { borderColor: color, backgroundColor: selected ? color : `${color}20` }]}
                onPress={() => toggle(Number(group.id))}
              >
                <Ionicons name={selected ? 'checkmark-circle' : (group.icon || 'albums')} size={18} color={selected ? '#121212' : color} />
                <Text style={[styles.chipText, { color: selected ? '#121212' : theme.text }]}>{group.name}</Text>
              </TouchableOpacity>
            );
          })}
          {mode === 'add' && (
            <TouchableOpacity style={[styles.chip, { borderColor: theme.accent }]} onPress={() => setGroupModalVisible(true)}>
              <Ionicons name="add" size={18} color={theme.accent} />
              <Text style={[styles.chipText, { color: theme.accent }]}>Criar grupo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </BaseModalBottom>
      <GroupModal
        visible={groupModalVisible}
        theme={theme}
        onClose={() => setGroupModalVisible(false)}
        onSave={handleCreated}
      />
    </>
  );
}

const getStyles = theme => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * z },
    chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18 * z, paddingHorizontal: 12 * z, paddingVertical: 9 * z },
    chipText: { marginLeft: 6 * z, fontSize: 13 * z, fontFamily: f }
  });
};
