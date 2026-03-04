import socket
import sounddevice as sd
import numpy as np

PORT = 8081
DEVICE_ID = 5 # CABLE Input ID (For my personal PC)
SAMPLE_RATE = 44100  # Standard Audio Quality
CHANNELS = 1

def start_receiver():
    # Start audio stream with settings
    stream = sd.OutputStream(
        device=DEVICE_ID,
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype='int16'
    )
    stream.start()

    # Socket TCP Configs
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('0.0.0.0', PORT))
        s.listen(1)
        print(f"Esperando conexión del Dispositivo en el puerto {PORT}...")
        
        conn, addr = s.accept()
        with conn:
            print(f"Conectado por {addr}")
            while True:
                data = conn.recv(1024) # Reception of audio data in bytes
                if not data:
                    break
                # Convert from bytes to numpy array and write to stream
                audio_array = np.frombuffer(data, dtype=np.int16)
                stream.write(audio_array)

if __name__ == "__main__":
    start_receiver()
