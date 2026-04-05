import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const VolumeBar = ({ volume }) => {
  const widthPercentage = Math.max(0, Math.min(100, volume));

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>Input level</Text>
        <Text style={styles.value}>{widthPercentage}%</Text>
      </View>
      <View style={styles.container}>
        <View style={[styles.bar, { width: `${widthPercentage}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#113946',
    fontWeight: '600',
  },
  value: {
    color: '#5B7083',
  },
  container: {
    width: '100%',
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 12,
  },
  bar: {
    height: '100%',
    backgroundColor: '#4F6F52',
  },
});

export default VolumeBar;
