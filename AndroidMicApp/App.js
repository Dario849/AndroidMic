import { React, useEffect, useState } from 'react';
import * as Keychain from 'react-native-keychain';
import { StyleSheet, Text, View, TouchableOpacity, PermissionsAndroid, TextInput } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import StatusIndicator from './components/StatusIndicator.js';
import VolumeBar from './components/VolumeSlider.js';
import { startBackgroundService, stopBackgroundService } from './components/BackgroundActions.js';

global.Buffer = Buffer;

const App = () => {
  const [status, setStatus] = useState(false);
  const [client, setClient] = useState(null);
  const [volume, setVolume] = useState(0);
  const [config, setConfig] = useState({ ip: '0.0.0.0', port: '8082' });
  const [showSettings, setShowSettings] = useState(false);

  // 1. Initial Permissions & Setup
  useEffect(() => {
    const setup = async () => {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

    };
    setup();

    // Load saved config if exists
    (async () => {
      const credentials = await Keychain.getGenericPassword({ service: 'micStreamerConfig' });
      if (credentials) {
        setConfig(JSON.parse(credentials.password));
      }
    })();

    // Setup Audio Options
    const options = {
      sampleRate: 44100,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      bufferSize: 4096,
    };
    LiveAudioStream.init(options);

    // Cleanup on unmount
    return () => {
      LiveAudioStream.stop();
      stopBackgroundService(); // Kill service if app is fully closed
    };
  }, []);

  // 2. The Streaming Logic
  // This listener survives in background BECAUSE 'startBackgroundService' keeps the bridge alive.
  useEffect(() => {
    LiveAudioStream.on('data', data => {
      if (client) {
        const buffer = Buffer.from(data, 'base64');

        // Calculate Volume Visuals
        let peak = 0;
        for (let i = 0; i < buffer.length; i += 2) {
          const sample = Math.abs(buffer.readInt16LE(i));
          if (sample > peak) peak = sample;
        }
        const normalizedVolume = Math.min(1000, (peak / 32767) * 1000);
        setVolume(normalizedVolume);

        // WRITE TO SOCKET
        try {
          client.write(buffer);
        } catch (e) {
          console.error("Write Error", e);
        }
      }
    });

    return () => {
      // Clean listener creates duplicates if not removed, though library handles it usually.
    };
  }, [client]);

  // 3. Master Toggle
  const toggleConnection = async () => {
    if (client) {
      // STOPPING
      LiveAudioStream.stop();
      client.destroy();
      setClient(null);
      setStatus(false);
      setVolume(0);
      await stopBackgroundService(); // Allow phone to sleep
    } else {
      // STARTING
      // A. Start the Service FIRST to ensure we have a background context
      await startBackgroundService();

      // B. Connect Socket
      const newClient = TcpSocket.createConnection({
        port: parseInt(config.port),
        host: config.ip,
        localAddress: "0.0.0.0"
      }, async () => {
        setStatus(true);
        // C. Start Mic only after connection
        LiveAudioStream.start();
        // D. Save client applied settings (host & port) for future session on app close or restart (Persistent settings)
        // Should config data be saved on successful connection or on every toggle? Im leaving it like this for now.
        await Keychain.setGenericPassword('config', JSON.stringify(config), { service: 'micStreamerConfig' });
      });
      newClient.on('error', (err) => {
        console.error('Socket Error: ', err);
        stopBackgroundService(); // Safety cleanup
        setStatus(false);
      });

      newClient.on('close', () => {
        console.log('Connection Closed');
        setStatus(false);
        stopBackgroundService();
      });

      setClient(newClient);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Android Mic Streamer</Text>

      <VolumeBar volume={volume} />

      <StatusIndicator connected={status} clientStatus={client} />

      <TouchableOpacity style={styles.button} onPress={toggleConnection}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {client ? 'STOP STREAM' : 'START SERVICE & STREAM'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={{ marginTop: 20 }}>
        <Text style={styles.toggleSettings}>Settings</Text>
      </TouchableOpacity>

      {showSettings && (
        <View style={styles.settingsArea}>
          <Text>IP Address</Text>
          <TextInput
            style={styles.input}
            onChangeText={(text) => setConfig({ ...config, ip: text })}
            value={config.ip}
            placeholder="192.168.1.X"
          />
          <Text>Port</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            onChangeText={(text) => setConfig({ ...config, port: text.replace(/[^0-9]/g, '') })}
            value={config.port}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FCFF', padding: 20 },
  title: { fontSize: 24, marginBottom: 30, fontWeight: 'bold' },
  button: { backgroundColor: '#2196F3', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 10, elevation: 5 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10, width: 200, paddingHorizontal: 10, borderRadius: 5 },
  toggleSettings: { color: 'gray', textDecorationLine: 'underline' },
  settingsArea: { marginTop: 20, padding: 20, backgroundColor: '#eee', borderRadius: 10 }
});

export default App;
