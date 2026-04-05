import * as Keychain from 'react-native-keychain';
import { PermissionsAndroid, Platform } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import TcpSocket from 'react-native-tcp-socket';

export const CONFIG_KEYCHAIN_SERVICE = 'micStreamerConfig';
export const DEFAULT_STREAM_CONFIG = {
  ip: '127.0.0.1',
  port: '8082',
  quickStartCollapsed: false,
};

const AUDIO_OPTIONS = {
  sampleRate: 44100,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  bufferSize: 4096,
};

export async function requestRuntimePermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export async function loadSavedConfig() {
  const credentials = await Keychain.getGenericPassword({
    service: CONFIG_KEYCHAIN_SERVICE,
  });

  if (!credentials) {
    return DEFAULT_STREAM_CONFIG;
  }

  try {
    const parsed = JSON.parse(credentials.password);
    return {
      ip: parsed.ip || DEFAULT_STREAM_CONFIG.ip,
      port: parsed.port || DEFAULT_STREAM_CONFIG.port,
      quickStartCollapsed:
        typeof parsed.quickStartCollapsed === 'boolean'
          ? parsed.quickStartCollapsed
          : DEFAULT_STREAM_CONFIG.quickStartCollapsed,
    };
  } catch {
    return DEFAULT_STREAM_CONFIG;
  }
}

export async function saveConfig(config) {
  await Keychain.setGenericPassword('config', JSON.stringify(config), {
    service: CONFIG_KEYCHAIN_SERVICE,
  });
}

export function initializeAudioStream() {
  LiveAudioStream.init(AUDIO_OPTIONS);
}

export function startAudioStream() {
  LiveAudioStream.start();
}

export function stopAudioStream() {
  LiveAudioStream.stop();
}

export function subscribeToAudioStream(listener) {
  LiveAudioStream.on('data', listener);

  return () => {
    if (typeof LiveAudioStream.removeAllListeners === 'function') {
      LiveAudioStream.removeAllListeners('data');
    }
  };
}

export function validateStreamConfig(config) {
  const host = config.ip.trim();
  const port = Number.parseInt(config.port, 10);

  if (!host) {
    return 'Enter the desktop host. Use 127.0.0.1 for USB with adb reverse, or your PC IP for Wi-Fi.';
  }

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    return 'Enter a valid TCP port between 1 and 65535.';
  }

  return null;
}

export function createStreamingClient(config, onConnect) {
  return TcpSocket.createConnection(
    {
      port: Number.parseInt(config.port, 10),
      host: config.ip.trim(),
      localAddress: '0.0.0.0',
    },
    onConnect,
  );
}

export function calculateVolumeLevel(buffer) {
  let peak = 0;

  for (let index = 0; index + 1 < buffer.length; index += 2) {
    const sample = Math.abs(buffer.readInt16LE(index));
    if (sample > peak) {
      peak = sample;
    }
  }

  return Math.min(100, Math.round((peak / 32767) * 100));
}