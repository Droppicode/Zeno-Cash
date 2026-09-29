import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomDatePicker from './ui/CustomDatePicker';
import BaseModalBottom from './ui/BaseModalBottom';
import { getSharedStyles } from '../utils/StyleHub';
import { getZoomFactor } from '../utils/scaler';

export const GROUP_ICONS = ['airplane', 'car', 'home', 'briefcase', 'gift', 'albums'];
export const GROUP_COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FFC107', '#795548', '#607D8B'];

export default function GroupModal({ visible, onClose, onSave, onDelete, onRules, initialGroup = null, theme }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(GROUP_ICONS[0]);
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [kind, setKind] = useState('ongoing');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [budget, setBudget] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const z = getZoomFactor(theme);
  const styles = useMemo(() => ({ ...getSharedStyles(theme), ...getLocalStyles(theme) }), [theme]);

  useEffect(() => {
    if (!visible) return;
    setName(initialGroup?.name || '');
    setDescription(initialGroup?.description || '');
    setIcon(initialGroup?.icon || GROUP_ICONS[0]);
    setColor(initialGroup?.color || GROUP_COLORS[0]);
    setKind(initialGroup?.kind || 'ongoing');
    setStartDate(initialGroup?.startDate ? new Date(initialGroup.startDate) : null);
    setEndDate(initialGroup?.endDate ? new Date(initialGroup.endDate) : null);
    setBudget(initialGroup?.budget != null ? String(initialGroup.budget).replace('.', ',') : '');
    setIsArchived(initialGroup?.isArchived === 1);
    setErrorMsg('');
  }, [visible, initialGroup]);

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('O nome do grupo é obrigatório.');
      return;
    }
    const normalizedBudget = budget.trim() ? parseFloat(budget.replace(',', '.')) : null;
    if (budget.trim() && (Number.isNaN(normalizedBudget) || normalizedBudget < 0)) {
      setErrorMsg('Informe um orçamento válido.');
      return;
    }
    await onSave(initialGroup?.id || null, {
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
      kind,
      startDate: startDate?.getTime() || null,
      endDate: endDate?.getTime() || null,
      budget: normalizedBudget,
      isArchived: isArchived ? 1 : 0
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Apagar grupo',
      'O grupo será apagado, mas as transações serão mantidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: async () => { await onDelete?.(initialGroup.id); onClose(); } }
      ]
    );
  };

  return (
    <BaseModalBottom
      visible={visible}
      title={initialGroup ? 'Editar Grupo' : 'Novo Grupo'}
      onClose={onClose}
      onSave={handleSave}
      errorMsg={errorMsg}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Nome</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Viagem Alagoas 2026"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Para que serve este grupo?"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Tipo</Text>
        <View style={[styles.toggleContainer, { backgroundColor: theme.cardSecondary }]}>
          {[
            ['event', 'Evento'],
            ['ongoing', 'Contínuo']
          ].map(([value, label]) => (
            <TouchableOpacity key={value} style={[styles.toggleBtn, kind === value && { backgroundColor: theme.accent }]} onPress={() => setKind(value)}>
              <Text style={[styles.toggleText, { color: kind === value ? '#121212' : theme.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Ícone</Text>
        <View style={styles.pickerRow}>
          {GROUP_ICONS.map(item => (
            <TouchableOpacity key={item} style={[styles.pickerItem, icon === item && { borderColor: theme.accent, backgroundColor: theme.accent + '30' }]} onPress={() => setIcon(item)}>
              <Ionicons name={item} size={24} color={icon === item ? theme.accent : theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Cor</Text>
        <View style={styles.pickerRow}>
          {GROUP_COLORS.map(item => (
            <TouchableOpacity key={item} style={[styles.colorItem, { backgroundColor: item }, color === item && { borderColor: theme.text, borderWidth: 3 }]} onPress={() => setColor(item)} />
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Início (opcional)</Text>
        <CustomDatePicker value={startDate} onChange={setStartDate} onClear={() => setStartDate(null)} theme={theme} placeholder="Selecionar início" style={{ marginBottom: 12 * z }} />
        <Text style={[styles.label, { color: theme.textSecondary }]}>Fim (opcional)</Text>
        <CustomDatePicker value={endDate} onChange={setEndDate} onClear={() => setEndDate(null)} theme={theme} placeholder="Selecionar fim" style={{ marginBottom: 12 * z }} />

        <Text style={[styles.label, { color: theme.textSecondary }]}>{kind === 'event' ? 'Orçamento (evento)' : 'Meta mensal (contínuo)'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text }]}
          value={budget}
          onChangeText={setBudget}
          placeholder="Opcional"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        {initialGroup && (
          <>
          {onRules && (
            <TouchableOpacity style={styles.rulesRow} onPress={onRules}>
              <Ionicons name="funnel-outline" size={18} color={theme.accent} />
              <Text style={{ color: theme.accent, fontFamily: theme.fontFamily || 'monospace' }}>Regras automáticas</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.archiveRow} onPress={() => setIsArchived(value => !value)}>
            <Ionicons name={isArchived ? 'checkbox' : 'square-outline'} size={20} color={isArchived ? theme.accent : theme.textSecondary} />
            <Text style={{ color: isArchived ? theme.accent : theme.textSecondary, fontFamily: theme.fontFamily || 'monospace' }}>Arquivar grupo</Text>
          </TouchableOpacity>
        )}
        {initialGroup && onDelete && (
          <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={theme.expense} />
            <Text style={{ color: theme.expense, fontFamily: theme.fontFamily || 'monospace' }}>Apagar grupo (mantém transações)</Text>
          </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </BaseModalBottom>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    toggleContainer: { flexDirection: 'row', borderRadius: 6 * z, padding: 4 * z, marginBottom: 16 * z },
    toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 9 * z, borderRadius: 4 * z },
    toggleText: { fontWeight: 'bold', fontFamily: f, fontSize: 13 * z },
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * z, marginBottom: 12 * z },
    pickerItem: { width: 42 * z, height: 42 * z, borderWidth: 1, borderColor: theme.cardSecondary, borderRadius: 6 * z, alignItems: 'center', justifyContent: 'center' },
    colorItem: { width: 30 * z, height: 30 * z, borderRadius: 15 * z },
    archiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 * z, paddingVertical: 12 * z },
    rulesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 * z, paddingVertical: 12 * z },
    deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 * z, paddingVertical: 12 * z }
  });
};
