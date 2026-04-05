import argparse
import socket
from dataclasses import dataclass

import numpy as np
import sounddevice as sd


@dataclass(frozen=True)
class RuntimeConfig:
    port: int
    device_id: int
    sample_rate: int
    channels: int


def parse_args() -> RuntimeConfig:
    parser = argparse.ArgumentParser(
        description="Receive Android microphone audio over TCP and route it to a Windows audio device.",
    )
    parser.add_argument("--port", type=int, default=8082, help="TCP port to listen on. Default: 8082")
    parser.add_argument(
        "--device_id",
        type=int,
        required=True,
        help="Output device ID reported by sounddevice.",
    )
    parser.add_argument(
        "--sample_rate",
        type=int,
        default=44100,
        help="Audio sample rate. Default: 44100",
    )
    parser.add_argument(
        "--channels",
        type=int,
        default=1,
        help="Output channel count. Default: 1",
    )
    args = parser.parse_args()

    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535.")
    if args.sample_rate <= 0:
        parser.error("--sample_rate must be greater than 0.")
    if args.channels <= 0:
        parser.error("--channels must be greater than 0.")

    return RuntimeConfig(
        port=args.port,
        device_id=args.device_id,
        sample_rate=args.sample_rate,
        channels=args.channels,
    )


def start_receiver(config: RuntimeConfig) -> None:
    stream = sd.OutputStream(
        device=config.device_id,
        samplerate=config.sample_rate,
        channels=config.channels,
        dtype="int16",
    )
    stream.start()

    print(
        f"Receiver ready on port {config.port} -> device {config.device_id} "
        f"({config.sample_rate} Hz, {config.channels} channel(s))."
    )

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.settimeout(1.0)
        server_socket.bind(("0.0.0.0", config.port))
        server_socket.listen(1)
        print(f"Listening on {config.port}. Press Ctrl+C to stop.")

        try:
            while True:
                try:
                    connection, address = server_socket.accept()
                except socket.timeout:
                    continue

                with connection:
                    print(f"Client connected: {address}")
                    connection.settimeout(1.0)
                    while True:
                        try:
                            data = connection.recv(2048)
                            if not data:
                                break
                            usable_length = (len(data) // 2) * 2
                            audio_array = np.frombuffer(data[:usable_length], dtype=np.int16)
                            stream.write(audio_array)
                        except socket.timeout:
                            continue
                        except Exception as error:
                            print(f"Receive error: {error}")
                            break
        except KeyboardInterrupt:
            print("\nShutting down receiver on user request...")
        finally:
            stream.stop()
            stream.close()
            print("Audio stream and socket closed.")


if __name__ == "__main__":
    start_receiver(parse_args())
