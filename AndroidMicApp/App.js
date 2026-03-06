import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, PermissionsAndroid, TextInput } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
//react-native-background-fetch Used for keeping the app alive in the background to continue streaming audio data to the server even when the app is closed or the device is locked.
import BackgroundFetch from 'react-native-background-fetch';
import StatusIndicator from './components/StatusIndicator.js';
import VolumeBar from './components/VolumeSlider.js';
global.Buffer = Buffer;


const App = () => {
  //Prepare background fetch to keep the app alive in the background to continue streaming audio data to the server even when the app is closed or the device is locked.
  useEffect(() => {
    BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // Fetch interval in minutes
        stopOnTerminate: false, // Continue running after app termination
        startOnBoot: true, // Start on device boot
        enableHeadless: true, // Enable headless mode
      },
      async (taskId) => {
        console.log('[BackgroundFetch] Task executed: ', taskId);
        // Perform any background work here, such as keeping the audio stream alive
        BackgroundFetch.finish(taskId);
      },
      (error) => {
        console.error('[BackgroundFetch] Failed to configure: ', error);
      }
    );
    return () => {
      BackgroundFetch.stop();
    };
  }, []);
  const [status, setStatus] = useState(false);
  const [client, setClient] = useState(null);
  const [volume, setVolume] = useState(0);
  const [config, setConfig] = useState({ ip: '127.0.0.1', port: '8082' });
  const [showSettings, setShowSettings] = useState(false);
  // 1. Request Permissions
  const requestPermission = async () => {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  };

  useEffect(() => {
    requestPermission();

    // Start headless task to keep the app alive in the background
    // This allows the app to continue streaming audio data to the server even when the app is closed or the device is locked.
    // Note: The actual implementation of the headless task is in index.js and MyTaskService.java
    // 2. Audio Configuration
    const options = {
      sampleRate: 44100,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // Voice Recognition source (cleaner)
      bufferSize: 4096,
    };

    LiveAudioStream.init(options);

    // 3. Handle data chunks from Mic + calculate volume based on data volume (peak)

    LiveAudioStream.on('data', data => {
      if (client) {
        const buffer = Buffer.from(data, 'base64');

        let peak = 0;
        for (let i = 0; i < buffer.length; i += 2) {
          const sample = Math.abs(buffer.readInt16LE(i));
          if (sample > peak) peak = sample;
        }
        const normalizedVolume = Math.min(1000, (peak / 32767) * 1000);

        setVolume(normalizedVolume);
        client.write(buffer);
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
      setStatus(false);
      setVolume(0);
    } else {
      const newClient = TcpSocket.createConnection({ port: parseInt(config.port), host: config.ip }, () => {
        setStatus(true);
        LiveAudioStream.start();
      });

      newClient.on('error', (err) => console.error('Socket Error: ', err));
      setClient(newClient);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Android Mic to PC</Text>
      <Text style={{ color: 'green' }}>Volumen</Text>
      <VolumeBar volume={volume} />
      <TouchableOpacity onPress={() => setShowSettings(!showSettings)}><Text style={styles.toggleSettings}>Configuraciones</Text></TouchableOpacity>
      {showSettings && (
        <View>

          <Text style={{ color: 'gray' }}>Dirección IP</Text>
          <TextInput
            style={styles.input}
            onChangeText={(text) => setConfig({ ...config, ip: text })}
            value={config.ip}
            placeholder="Dirección IP"
          />
          <Text style={{ color: 'gray' }}>Puerto</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            onChangeText={(text) => setConfig({ ...config, port: text.replace(/[^0-9]/g, '') })}
            value={config.port}
            placeholder="PUERTO"
          />

        </View>
      )}


      <StatusIndicator connected={status} clientStatus={client} />
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
  button: { backgroundColor: '#2196F3', padding: 20, borderRadius: 10 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 20, paddingHorizontal: 10 },
  toggleSettings: { backgroundColor: '#173ad4', padding: 10, borderRadius: 8 }
});

export default App;
