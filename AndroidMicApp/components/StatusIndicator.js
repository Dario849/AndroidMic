import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusIndicator = ({ connected, clientStatus }) => {
  return (
    <View style={styles.container}>
      <View style={[
        styles.circle,
        { backgroundColor: connected ? '#4CAF50' : '#F44336' }
      ]} />
      <Text>{connected ? 'Conectado al PC' : 'Desconectado'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', margin: 20 },
  circle: { width: 15, height: 15, borderRadius: 10, marginRight: 10 }
});

export default StatusIndicator;
