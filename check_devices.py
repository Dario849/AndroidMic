import sounddevice as sd

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
