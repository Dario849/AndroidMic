import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, PermissionsAndroid } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
global.Buffer = Buffer;


const App = () => {
  const [status, setStatus] = useState('Disconnected');
  const [client, setClient] = useState(null);

  // 1. Request Permissions
  const requestPermission = async () => {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  };

  useEffect(() => {
    requestPermission();

    // 2. Audio Configuration
    const options = {
      sampleRate: 44100,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // Voice Recognition source (cleaner)
      bufferSize: 4096,
    };

    LiveAudioStream.init(options);

    // 3. Handle data chunks from Mic
    LiveAudioStream.on('data', data => {
      if (client) {
        const buffer = Buffer.from(data, 'base64');
        client.write(buffer); // Send to PC via TCP
      }
    });

    return () => {
      LiveAudioStream.stop();
      if (client) client.destroy();
    };
  }, [client]);

  // 4. Connection Logic
  const toggleConnection = () => {
    if (client) {
      LiveAudioStream.stop();
      client.destroy();
      setClient(null);
      setStatus('Disconnected');
    } else {
      // Connect to 127.0.0.1:8081
      const newClient = TcpSocket.createConnection({ port: 8081, host: '127.0.0.1' }, () => {
        setStatus('CONNECTED');
        LiveAudioStream.start();
      });

      newClient.on('error', (err) => console.log('Socket Error: ', err));
      setClient(newClient);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Android Mic to PC</Text>
      <Text style={styles.status}>{status}</Text>
      <TouchableOpacity style={styles.button} onPress={toggleConnection}>
        <Text style={{ color: 'white' }}>{client ? 'STOP' : 'START STREAM'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FCFF' },
  title: { fontSize: 20, marginBottom: 20 },
  status: { fontWeight: 'bold', color: 'blue', marginBottom: 20 },
  button: { backgroundColor: '#2196F3', padding: 20, borderRadius: 10 }
});

export default App;
