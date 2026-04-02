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


## Dependency checks

```powershell
pnpm run deps:check-lockfiles
pnpm run deps:audit
```

## Notes

- Desktop service defaults to TCP port `8082`.
- For USB use `adb reverse tcp:8082 tcp:8082`.
- Keep app and desktop host/port settings aligned.
