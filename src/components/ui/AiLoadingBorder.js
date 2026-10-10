import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const DASH = 6;
const GAP = 5;
const STROKE = 2;

export default function AiLoadingBorder({ active, color, radius = 6, style, children }) {
  const [size, setSize] = useState(null);
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    offset.setValue(0);
    const loop = Animated.loop(Animated.timing(offset, {
      toValue: -(DASH + GAP) * 4,
      duration: 1200,
      easing: Easing.linear,
      useNativeDriver: false
    }));
    loop.start();
    return () => loop.stop();
  }, [active, offset]);

  return (
    <View
      style={style}
      onLayout={active ? e => setSize(e.nativeEvent.layout) : undefined}
    >
      {children}
      {active && size && (
        <Svg
          pointerEvents="none"
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          testID="ai-loading-border"
        >
          <AnimatedRect
            x={STROKE / 2}
            y={STROKE / 2}
            width={Math.max(0, size.width - STROKE)}
            height={Math.max(0, size.height - STROKE)}
            rx={radius}
            ry={radius}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={`${DASH} ${GAP}`}
            strokeDashoffset={offset}
          />
        </Svg>
      )}
    </View>
  );
}
