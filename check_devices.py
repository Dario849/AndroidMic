import sounddevice as sd

devices = sd.query_devices()
print("--- DISPOSITIVOS DETECTADOS ---")
for i, dev in enumerate(devices):
    print(f"ID: {i} | Name: {dev['name']} | Max Inputs: {dev['max_input_channels']} | Max Outputs: {dev['max_output_channels']}")
