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

1. Validate `adb` and VB-Audio Virtual Cable.
2. Use bundled `check_devices.exe` to list output devices without requiring `.venv`.
3. Ask you to connect an Android device over USB and enable USB debugging.
4. Validate the device with `adb devices`, with retry support.
5. Build a standalone release APK with Gradle (`:app:assembleRelease`).
6. Install the APK using `adb install -r -d`.
7. Verify the app package is installed on the device.
8. Ask you to open the Android app manually.
9. Prompt for `port` and required `device_id`.
10. Run `adb reverse tcp:<port> tcp:<port>`.
11. Start the desktop receiver (prefers bundled executable, falls back to Python runtime).

When the receiver starts, verify audio by selecting `CABLE Output (VB-Audio Virtual Cable)` in your recording software. Stop the receiver with `Ctrl + C`.

The installed Android app remains on the device like a normal app until the user uninstalls it.

## Choosing the audio device_id

The setup CLI now prefers a bundled executable checker:

```powershell
cd c:\AndroidMic
check_devices.exe
```

If `check_devices.exe` is not present, developer fallback is still available:

```powershell
cd c:\AndroidMic
.venv\Scripts\activate
python check_devices.py
```

Use the VB-Audio output device ID as `--device_id`.

## Build bundled executables (for distribution)

Build both desktop binaries once on the dev machine:

```powershell
cd c:\AndroidMic
uv sync --extra build
uv run pyinstaller --onefile --name check_devices check_devices.py
uv run pyinstaller --onefile --name main main.py
```

Copy these files to the final deliverable folder:

1. `dist\check_devices.exe`
2. `dist\main.exe`
3. `AndroidMicApp` setup scripts and APK flow files

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
uv run pyinstaller --onefile --name main main.py
```

After that, subsequent runs only need the executable and the same CLI arguments:

```powershell
dist\main.exe --port 8082 --device_id 5 --sample_rate 44100 --channels 1
```

Within the repository, both `check_devices` and `main.exe` are exposed inside the `/dist` folder for non-technical users. You can create the files like mentioned above to better suit the specifications of your local environment.
  
You do not need to repeat the React Native release install unless you intentionally want to redeploy the Android app.
