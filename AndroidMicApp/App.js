import React, { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import StatusIndicator from './components/StatusIndicator.js';
import VolumeBar from './components/VolumeSlider.js';
import { startBackgroundService, stopBackgroundService } from './components/BackgroundActions.js';
import {
  DEFAULT_STREAM_CONFIG,
  calculateVolumeLevel,
  createStreamingClient,
  initializeAudioStream,
  loadSavedConfig,
  requestRuntimePermissions,
  saveConfig,
  startAudioStream,
  stopAudioStream,
  subscribeToAudioStream,
  validateStreamConfig,
} from './components/AudioStreamModule.js';

global.Buffer = Buffer;

const App = () => {
  const [status, setStatus] = useState(false);
  const [client, setClient] = useState(null);
  const [volume, setVolume] = useState(0);
  const [config, setConfig] = useState(DEFAULT_STREAM_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Ready. Run the Windows setup CLI first, then start streaming from Android.',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(true);

  const isQuickStartCollapsed = config.quickStartCollapsed === true;

  const setQuickStartCollapsed = async collapsed => {
    const nextConfig = {
      ...config,
      quickStartCollapsed: collapsed,
    };

    setConfig(nextConfig);
    await saveConfig(nextConfig);
  };

  const resetStreamingState = async nextStatusMessage => {
    stopAudioStream();
    setStatus(false);
    setClient(null);
    setVolume(0);
    setStatusMessage(nextStatusMessage);
    await stopBackgroundService();
  };

  useEffect(() => {
    const setup = async () => {
      const granted = await requestRuntimePermissions();
      setPermissionsGranted(granted);
      if (!granted) {
        setErrorMessage('Microphone permission is required before streaming can start.');
      }

      const savedConfig = await loadSavedConfig();
      setConfig(savedConfig);
      initializeAudioStream();
    };

    setup();

    return () => {
      stopAudioStream();
      stopBackgroundService();
    };
  }, []);

  useEffect(() => {
    // The background service keeps the JS bridge alive, so the audio listener can keep forwarding PCM chunks.
    const unsubscribe = subscribeToAudioStream(data => {
      if (!client) {
        return;
      }

      const buffer = Buffer.from(data, 'base64');
      setVolume(calculateVolumeLevel(buffer));

      try {
        client.write(buffer);
      } catch (error) {
        console.error('Write Error', error);
        setErrorMessage('Audio write failed. Stop the stream and reconnect.');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [client]);

  const stopStreamingSession = async () => {
    if (client) {
      client.destroy();
    }

    await resetStreamingState('Streaming stopped. You can adjust settings and start again.');
  };

  const toggleConnection = async () => {
    if (client) {
      await stopStreamingSession();
      return;
    }

    if (!permissionsGranted) {
      setErrorMessage('Grant microphone permission before starting the stream.');
      return;
    }

    const configError = validateStreamConfig(config);
    if (configError) {
      setErrorMessage(configError);
      setShowSettings(true);
      return;
    }

    setErrorMessage('');
    setStatusMessage('Connecting to the desktop receiver...');
    await startBackgroundService();

    const nextClient = createStreamingClient(config, async () => {
      setErrorMessage('');
      setStatus(true);
      setStatusMessage('Connected. Microphone audio is being sent to the desktop receiver.');
      startAudioStream();

      const nextConfig = {
        ...config,
        quickStartCollapsed: true,
      };
      setConfig(nextConfig);
      await saveConfig(nextConfig);
    });

    nextClient.on('error', err => {
      console.error('Socket Error:', err);
      setErrorMessage(`Socket error: ${err.message}`);
      resetStreamingState(
        'Connection failed. Verify host, port, and desktop receiver status.',
      );
    });

    nextClient.on('close', () => {
      resetStreamingState(
        'Connection closed. Start again after the desktop receiver is ready.',
      );
    });

    setClient(nextClient);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Android Mic Streamer</Text>
          <Text style={styles.subtitle}>
            Use your android device to stream microphone audio to your desktop.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.card, styles.quickStartCard]}
          activeOpacity={0.9}
          onPress={() => setQuickStartCollapsed(!isQuickStartCollapsed)}>
          <Text style={styles.cardTitle}>Quick Start</Text>
          {isQuickStartCollapsed ? (
            <Text style={styles.stepHint}>Collapsed while streaming. Tap to expand.</Text>
          ) : (
            <>
              <Text style={styles.step}>1. On Windows, run `pnpm run setup:windows` or `LanzadorMicApp.bat`.</Text>
              <Text style={styles.step}>2. After the release install, open this app manually on the phone.</Text>
              <Text style={styles.step}>3. For USB, keep host `127.0.0.1` and port `8082`.</Text>
              <Text style={styles.step}>4. For Wi-Fi, set the Windows PC IPv4 address and matching port.</Text>
              <Text style={styles.stepHint}>Tap this card to collapse.</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <StatusIndicator connected={status} statusMessage={statusMessage} />
          <VolumeBar volume={volume} />
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={toggleConnection}>
            <Text style={styles.buttonLabel}>
              {client ? 'STOP STREAM' : 'START SERVICE & STREAM'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowSettings(!showSettings)}
          style={styles.settingsToggle}>
          <Text style={styles.toggleSettings}>
            {showSettings ? 'Hide Connection Settings' : 'Show Connection Settings'}
          </Text>
        </TouchableOpacity>

        {showSettings && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connection Settings</Text>

            <Text style={styles.fieldLabel}>Host</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              onChangeText={text => setConfig({ ...config, ip: text })}
              value={config.ip}
              placeholder="127.0.0.1 or 192.168.1.x"
            />
            <Text style={styles.helperText}>
              Use `127.0.0.1` when the Windows setup CLI created `adb reverse` over USB.
            </Text>

            <Text style={styles.fieldLabel}>Port</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              onChangeText={text =>
                setConfig({ ...config, port: text.replace(/[^0-9]/g, '') })
              }
              value={config.port}
              placeholder="8082"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#113946',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    color: '#FFF8E8',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: '#DDE6ED',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  quickStartCard: {
    borderWidth: 1,
    borderColor: '#D5E3E8',
  },
  cardTitle: {
    color: '#113946',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  step: {
    color: '#334E68',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  stepHint: {
    color: '#5B7083',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  button: {
    backgroundColor: '#C5612D',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#FFF8E8',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  settingsToggle: {
    alignSelf: 'center',
  },
  toggleSettings: {
    color: '#4F6F52',
    fontWeight: '600',
  },
  fieldLabel: {
    color: '#113946',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderColor: '#C9D7DD',
    borderWidth: 1,
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
  },
  helperText: {
    color: '#5B7083',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
});

export default App;
