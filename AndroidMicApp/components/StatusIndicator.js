import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const StatusIndicator = ({ connected, statusMessage }) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          { backgroundColor: connected ? '#4F6F52' : '#C5612D' },
        ]}
      />
      <View style={styles.textWrap}>
        <Text style={styles.label}>
          {connected ? 'Connected to desktop' : 'Not connected'}
        </Text>
        <Text style={styles.message}>{statusMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
    marginTop: 4,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    color: '#113946',
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: '#5B7083',
    lineHeight: 20,
  },
});

export default StatusIndicator;
