import socket
import sounddevice as sd
import numpy as np

PORT = 8082
DEVICE_ID = 5
SAMPLE_RATE = 44100 
CHANNELS = 1

def start_receiver():
    stream = sd.OutputStream(
        device=DEVICE_ID,
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype='int16'
    )
    stream.start()


    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.settimeout(1.0) 
        s.bind(('0.0.0.0', PORT))
        s.listen(1)
        print(f"Escuchando en {PORT}. Presiona Ctrl+C para salir.")

        try:
            while True:
                try:
                    conn, addr = s.accept()
                except socket.timeout:
                    continue
                
                with conn:
                    print(f"Conectado por {addr}")
                    conn.settimeout(1.0)
                    while True:
                        try:
                            data = conn.recv(2048)
                            if not data: break
                            usable_length = (len(data) // 2) * 2
                            audio_array = np.frombuffer(data[:usable_length], dtype=np.int16)
                            stream.write(audio_array)
                        except socket.timeout:
                            continue 
                        except Exception as e:
                            print(f"Error en recepción: {e}")
                            break
        except KeyboardInterrupt:
            print("\n[SALIENDO] Cerrando servidor por usuario...")
        finally:
            stream.stop()
            print("Stream y Socket cerrados correctamente.")

if __name__ == "__main__":
    start_receiver()
