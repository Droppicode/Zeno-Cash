import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { SettingsContext } from '../context/SettingsContext';
import { useGroups } from '../hooks/useGroups';
import GroupModal from '../components/GroupModal';
import ListCard from '../components/ui/ListCard';
import { getSharedStyles } from '../utils/StyleHub';
import { getZoomFactor } from '../utils/scaler';

export default function GroupsConfigScreen({ onBack, navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const { groupList, loadGroups, saveGroup, deleteGroup, reorderGroups } = useGroups();
  const [showEditor, setShowEditor] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const scrollableRef = useAnimatedRef();
  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  useEffect(() => { loadGroups({ includeArchived: true }); }, [loadGroups]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}><Ionicons name="arrow-back" size={24} color={activeTheme.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Grupos</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView ref={scrollableRef} contentContainerStyle={styles.scroll}>
        <Text style={{ color: activeTheme.textSecondary, fontSize: 12 * z, marginBottom: 12 * z }}>
          Segure e arraste para reordenar
        </Text>
        <Sortable.Grid
          columns={1}
          data={groupList}
          keyExtractor={group => String(group.id)}
          scrollableRef={scrollableRef}
          activeItemScale={1.04}
          dragActivationDelay={150}
          onDragEnd={({ data }) => reorderGroups(data.map(group => group.id))}
          renderItem={({ item: group, index }) => (
            <ListCard
              index={index}
              total={groupList.length}
              style={group.isArchived === 1 && { opacity: 0.55 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.iconBox, { backgroundColor: `${group.color || activeTheme.accent}25` }]}>
                  <Ionicons name={group.icon || 'albums'} size={20} color={group.color || activeTheme.accent} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.groupName, { color: activeTheme.text }]}>{group.name}</Text>
                  <Text style={[styles.groupMeta, { color: activeTheme.textSecondary }]}>{group.kind === 'event' ? 'Evento' : 'Contínuo'}{group.isArchived === 1 ? ' • Arquivado' : ''}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingGroup(group); setShowEditor(true); }}><Ionicons name="pencil" size={20} color={activeTheme.textSecondary} /></TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Apagar grupo', 'As transações serão mantidas.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: () => deleteGroup(group.id) }])}><Ionicons name="trash" size={20} color={activeTheme.expense} /></TouchableOpacity>
              </View>
            </ListCard>
          )}
        />
        <TouchableOpacity style={[styles.addBtn, { borderColor: activeTheme.accent }]} onPress={() => { setEditingGroup(null); setShowEditor(true); }}>
          <Ionicons name="add" size={20} color={activeTheme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.addBtnText, { color: activeTheme.accent }]}>Novo Grupo</Text>
        </TouchableOpacity>
      </ScrollView>
      <GroupModal
        visible={showEditor}
        theme={activeTheme}
        initialGroup={editingGroup}
        onClose={() => setShowEditor(false)}
        onSave={async (id, data) => saveGroup(id, data)}
        onDelete={deleteGroup}
        onRules={editingGroup ? () => { setShowEditor(false); navigation.navigate('GroupRules', { groupId: editingGroup.id }); } : undefined}
      />
    </View>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    iconBox: { width: 40 * z, height: 40 * z, borderRadius: 8 * z, justifyContent: 'center', alignItems: 'center' },
    groupName: { fontSize: 16 * z, fontWeight: 'bold', marginBottom: 2 * z, fontFamily: f },
    groupMeta: { fontSize: 12 * z, fontFamily: f }
  });
};
