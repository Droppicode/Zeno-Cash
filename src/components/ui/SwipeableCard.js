import React, { useContext, useMemo, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../../context/SettingsContext';
import { getZoomFactor } from '../../utils/scaler';

export default function SwipeableCard({ children, onDelete, deleteText = 'Apagar', containerStyle }) {
  const { activeTheme } = useContext(SettingsContext);
  const z = getZoomFactor(activeTheme);
  const f = activeTheme.fontFamily || 'monospace';

  const styles = useMemo(() => StyleSheet.create({
    deleteAction: { width: 80 * z, justifyContent: 'center', alignItems: 'center' },
    deleteActionText: { fontSize: 12 * z, fontWeight: 'bold', marginTop: 4 * z, fontFamily: f, color: '#fff' }
  }), [z, f]);

  const renderRightActions = () => (
    <TouchableOpacity 
      style={[styles.deleteAction, { backgroundColor: activeTheme.expense }]}
      onPress={onDelete}
    >
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.deleteActionText}>{deleteText}</Text>
    </TouchableOpacity>
  );

  const flattenedStyle = StyleSheet.flatten(containerStyle) || {};
  const [isSwiping, setIsSwiping] = useState(false);

  return (
    <View style={containerStyle}>
      <Swipeable 
        renderRightActions={renderRightActions} 
        overshootRight={false}
        onSwipeableWillOpen={() => setIsSwiping(true)}
        onSwipeableWillClose={() => setIsSwiping(false)}
        containerStyle={{ 
          overflow: 'hidden', 
          borderTopLeftRadius: flattenedStyle.borderTopLeftRadius || flattenedStyle.borderRadius || 0,
          borderTopRightRadius: flattenedStyle.borderTopRightRadius || flattenedStyle.borderRadius || 0,
          borderBottomLeftRadius: flattenedStyle.borderBottomLeftRadius || flattenedStyle.borderRadius || 0,
          borderBottomRightRadius: flattenedStyle.borderBottomRightRadius || flattenedStyle.borderRadius || 0,
        }}
      >
        {typeof children === 'function' ? children(isSwiping) : children}
      </Swipeable>
    </View>
  );
}
