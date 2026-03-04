import React from 'react';
import { View, StyleSheet } from 'react-native';

const VolumeBar = ({ volume }) => {
  const widthPercentage = (volume / 255) * 100;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { width: `${widthPercentage}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '80%',
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 20,
  },
  bar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
});

export default VolumeBar;
