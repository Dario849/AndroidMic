# AndroidMic

Android phone microphone streaming to PC over TCP (USB or Wi-Fi).

## Canonical package managers

- Python tooling: `uv`
- React Native app: `pnpm`

Do not use npm or yarn lockfiles in `AndroidMicApp`.

## Prerequisites

- Windows + ADB installed and available in PATH
- Python 3.12
- Node.js 22.11+
- pnpm installed globally

## Python setup (root project)

```powershell
cd c:\AndroidMic
uv sync
```

Run the local audio server directly:

```powershell
uv run python main.py
```

Build executable (optional):

```powershell
uv sync --extra build
uv run pyinstaller main.spec
```

## React Native app setup

```powershell
cd c:\AndroidMic\AndroidMicApp
pnpm install --frozen-lockfile
pnpm run android
```

## USB connection flow

```powershell
adb reverse tcp:8082 tcp:8082
```

Then run one of:

- `LanzadorMicApp.bat`
- `uv run python main.py`

In the mobile app, keep host `localhost` and port `8082`.

## Wi-Fi connection flow

1. Run `ipconfig /all` and get your IPv4 address.
2. In app settings, set host to that IPv4 and port to `8082`.
3. Start the local server with `uv run python main.py`.

## Dependency hygiene

- JS reproducibility: `pnpm install --frozen-lockfile`
- JS audit: `pnpm audit --prod`
- Python reproducibility: `uv sync --frozen`
- Python audit: `uv tree`
