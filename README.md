# AndroidMic

Android App + Windows Python receiver for real-time audio streaming over USB.

## Package managers

- Python tooling: `uv`
- React Native app: `pnpm`

Do not create npm or yarn lockfiles inside `AndroidMicApp`.

## One-time project setup

```powershell
cd c:\AndroidMic
uv sync
cd .\AndroidMicApp
pnpm install --frozen-lockfile
```

## Guided Windows setup and runtime

Run the guided CLI from the React Native app folder:

```powershell
cd c:\AndroidMic\AndroidMicApp
pnpm run setup:windows
```

You can also launch the same flow from the repository root with `LanzadorMicApp.bat`.

The CLI will:

1. Validate `adb`, `python`, and VB-Audio Virtual Cable.
2. Ask you to connect an Android device over USB and enable USB debugging.
3. Validate the device with `adb devices`, with retry support.
4. Build a standalone release APK with Gradle (`:app:assembleRelease`).
5. Install the APK using `adb install -r -d`.
6. Verify the app package is installed on the device.
7. Ask you to open the Android app manually.
8. Prompt for `port` and required `device_id`.
9. Run `adb reverse tcp:<port> tcp:<port>`.
10. Start the Python receiver in the same terminal.

When the receiver starts, verify audio by selecting `CABLE Output (VB-Audio Virtual Cable)` in your recording software. Stop the receiver with `Ctrl + C`.

The installed Android app remains on the device like a normal app until the user uninstalls it.

## Choosing the audio device_id

List output-capable Windows audio devices with:

```powershell
cd c:\AndroidMic
python check_devices.py
```

Use the VB-Audio output device ID as `--device_id`.

## Direct Python runtime

The receiver no longer uses hardcoded runtime settings. Start it explicitly with CLI arguments:

```powershell
cd c:\AndroidMic
python main.py --port 8082 --device_id 5 --sample_rate 44100 --channels 1
```

`device_id` is required. `port`, `sample_rate`, and `channels` have defaults.

## Standalone executable

Build a reusable Windows executable with PyInstaller:

```powershell
cd c:\AndroidMic
uv sync --extra build
uv run pyinstaller --onefile --name androidmic-service main.py
```

After that, subsequent runs only need the executable and the same CLI arguments:

```powershell
dist\androidmic-service.exe --port 8082 --device_id 5 --sample_rate 44100 --channels 1
```

You do not need to repeat the React Native release install unless you intentionally want to redeploy the Android app.
