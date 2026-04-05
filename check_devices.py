import sys

try:
    import sounddevice as sd
except ModuleNotFoundError:
    print("[ERROR] Python module 'sounddevice' is not available.")
    print("Use the bundled check_devices.exe for end-user environments.")
    print("Developer fallback: activate .venv and run 'python check_devices.py'.")
    sys.exit(1)

devices = sd.query_devices()
print("--- OUTPUT DEVICES DETECTED ---")
for index, device in enumerate(devices):
    if device["max_output_channels"] <= 0:
        continue
    print(
        f"ID: {index} | Name: {device['name']} | "
        f"Max Outputs: {device['max_output_channels']}"
    )

print("\nUse the VB-Audio device ID as the --device_id value.")
