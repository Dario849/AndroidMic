# AndroidMicApp

React Native mobile client for streaming microphone audio to the desktop service.

## Package manager policy

- Canonical manager: `pnpm`
- Canonical lockfile: `pnpm-lock.yaml`
- Do not commit `package-lock.json` or `yarn.lock`

## Setup

```powershell
cd c:\AndroidMic\AndroidMicApp
pnpm install --frozen-lockfile
```

## Run (Android)

```powershell
pnpm run start
pnpm run android
```

## Newcomer flow

1. On Windows, complete the desktop setup with `LanzadorMicApp.bat` or `pnpm run setup:windows`.
2. The setup builds `app-release.apk`, installs it with `adb install -r -d`, and verifies installation.
3. Open the Android app after install completes.
4. The app remains installed on the device like any regular APK until manually uninstalled.
5. For USB, keep host `127.0.0.1` and port `8082`.
6. For Wi-Fi, use the Windows PC IPv4 address and the same port configured in the desktop receiver.

The mobile UI mirrors those instructions via the **Quick Start** card. The card auto-collapses when a stream starts successfully and can be tapped to expand again. Its collapsed state is persisted in the device Keychain.

## Component structure

```
App.js                       Root component. Session lifecycle, UI layout.
components/
  AudioStreamModule.js       Config persistence (Keychain), runtime permissions,
                             audio stream lifecycle, TCP socket factory,
                             input validation and volume calculation.
  BackgroundActions.js       react-native-background-actions wrapper.
                             Keeps the JS bridge alive so audio listeners
                             continue firing while the app is backgrounded.
  StatusIndicator.js         Connected/disconnected indicator with status text.
  VolumeSlider.js            Real-time input level bar (0–100 %).
scripts/
  buildAndroid.js            Windows CLI orchestrator. Run via setup:windows.
index.js                     AppRegistry entry point only.
```

### Config persistence

Connection settings and Quick Start card state are persisted via `react-native-keychain`
under the service key `micStreamerConfig`. Stored fields:

| Field                 | Default     | Description                    |
| --------------------- | ----------- | ------------------------------ |
| `ip`                  | `127.0.0.1` | Desktop host                   |
| `port`                | `8082`      | Desktop TCP port               |
| `quickStartCollapsed` | `false`     | Quick Start card display state |

## Dependency checks

```powershell
pnpm run deps:check-lockfiles
pnpm run deps:audit
```

## Notes

- Desktop service defaults to TCP port `8082`.
- For USB use `adb reverse tcp:8082 tcp:8082`.
- Keep app and desktop host/port settings aligned.
