import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

// Number of bars in the waveform
const BAR_COUNT = 30;

export default function RecordingWaveform() {
  const { colors } = useTheme();
  const animations = useRef<Animated.Value[]>([]);
  
  // Initialize animations array if empty
  if (animations.current.length === 0) {
    for (let i = 0; i < BAR_COUNT; i++) {
      animations.current.push(new Animated.Value(0));
    }
  }
  
  useEffect(() => {
    // Start the animation
    animateBars();
    
    // Clean up on unmount
    return () => {
      animations.current.forEach(anim => anim.stopAnimation());
    };
  }, []);
  
  const animateBars = () => {
    // Create animations for each bar
    const animationsArray = animations.current.map((anim, index) => {
      // Reset to a random starting height
      anim.setValue(Math.random() * 0.5 + 0.1);
      
      // Create a random duration between 400ms and 800ms
      const duration = Math.random() * 400 + 400;
      
      // Animate to a random height
      return Animated.sequence([
        Animated.timing(anim, {
          toValue: Math.random() * 0.8 + 0.2,
          duration: duration,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: Math.random() * 0.5 + 0.1,
          duration: duration,
          useNativeDriver: false,
        }),
      ]);
    });
    
    // Run all animations in parallel and loop
    Animated.parallel(animationsArray).start(() => {
      // Loop the animation
      animateBars();
    });
  };
  
  return (
    <View style={styles.container}>
      {animations.current.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: colors.primary,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    width: '80%',
  },
  bar: {
    width: 3,
    marginHorizontal: 2,
    borderRadius: 3,
  },
});