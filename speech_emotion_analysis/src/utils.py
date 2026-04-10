import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write

def record_audio(filename="temp.wav", duration=3, fs=44100):
    print("Recording...")
    
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
    sd.wait()

    # 🔥 CONVERT FLOAT → INT16 (VERY IMPORTANT)
    recording = (recording * 32767).astype(np.int16)

    write(filename, fs, recording)

    print("Recording complete")