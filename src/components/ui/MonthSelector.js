import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, FlatList } from 'react-native';
import { getZoomFactor } from '../../utils/scaler';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const toYYYYMM = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const MonthItem = React.memo(({ item, index, ITEM_WIDTH, scrollX, isSelected, onPress, styles }) => {
  const position = Animated.subtract(index * ITEM_WIDTH, scrollX);
  
  const opacity = position.interpolate({
    inputRange: [-ITEM_WIDTH * 2.5, -ITEM_WIDTH * 2, -ITEM_WIDTH, 0, ITEM_WIDTH, ITEM_WIDTH * 2, ITEM_WIDTH * 2.5],
    outputRange: [0, 0.2, 0.6, 1, 0.6, 0.2, 0],
    extrapolate: 'clamp',
  });

  const scale = position.interpolate({
    inputRange: [-ITEM_WIDTH * 2, -ITEM_WIDTH, 0, ITEM_WIDTH, ITEM_WIDTH * 2],
    outputRange: [0.75, 0.9, 1.2, 0.9, 0.75],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity 
      style={styles.itemContainer} 
      activeOpacity={1}
      onPress={() => onPress(item)}
    >
      <Animated.Text style={[
        styles.text, 
        isSelected && styles.selectedText,
        { opacity, transform: [{ scale }] }
      ]}>
        {MONTH_NAMES[item.date.getMonth()]}
      </Animated.Text>
    </TouchableOpacity>
  );
});

export default function MonthSelector({ theme, centerDate, selectedMonths, onCenterChange, onSelectionChange }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  const ITEM_WIDTH = 38 * z;
  const VISIBLE_ITEMS = 5;
  const SELECTOR_WIDTH = ITEM_WIDTH * VISIBLE_ITEMS;
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const currentIndexRef = useRef(-1);
  const selectedMonthsRef = useRef(selectedMonths);
  selectedMonthsRef.current = selectedMonths; // Sincroniza imediatamente durante o render

  const monthData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = -60; i <= 60; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      data.push({
        date: d,
        key: toYYYYMM(d),
        index: i + 60
      });
    }
    return data;
  }, []);

  useEffect(() => {
    const initialIndex = monthData.findIndex(m => m.key === toYYYYMM(centerDate));
    if (initialIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false, viewPosition: 0.5 });
      }, 100);
    }
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      width: SELECTOR_WIDTH,
      height: 30 * z,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemContainer: {
      width: ITEM_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontFamily: f,
      fontSize: 13 * z,
      color: theme.textSecondary,
    },
    selectedText: {
      color: theme.text,
      fontWeight: 'bold',
      fontSize: 15 * z,
    }
  }), [theme, z, f, SELECTOR_WIDTH, ITEM_WIDTH]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const handleScrollEnd = useCallback((event) => {
    const x = event.nativeEvent.contentOffset.x;
    const centerIndex = Math.round(x / ITEM_WIDTH);
    
    if (centerIndex >= 0 && centerIndex < monthData.length && centerIndex !== currentIndexRef.current) {
      currentIndexRef.current = centerIndex;
      const newCenterItem = monthData[centerIndex];
      onCenterChange(newCenterItem.date);
      
      onSelectionChange([newCenterItem.key]);
    }
  }, [ITEM_WIDTH, monthData, onCenterChange, onSelectionChange]);

  const handlePress = useCallback((item) => {
     let newSelection = [...selectedMonthsRef.current];
     if (newSelection.includes(item.key)) {
       newSelection = newSelection.filter(k => k !== item.key);
     } else {
       newSelection.push(item.key);
     }
     if (newSelection.length === 0) newSelection = [item.key];
     onSelectionChange(newSelection);
  }, [onSelectionChange]);

  const renderItem = useCallback(({ item, index }) => {
    const isSelected = selectedMonthsRef.current.includes(item.key);
    return (
      <MonthItem 
        item={item} 
        index={index} 
        ITEM_WIDTH={ITEM_WIDTH} 
        scrollX={scrollX} 
        isSelected={isSelected} 
        onPress={handlePress} 
        styles={styles} 
      />
    );
  }, [ITEM_WIDTH, scrollX, handlePress, styles]);

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={monthData}
        extraData={selectedMonths}
        keyExtractor={item => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: (SELECTOR_WIDTH - ITEM_WIDTH) / 2 }}
        renderItem={renderItem}
        onScroll={onScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index })}
      />
    </View>
  );
}
