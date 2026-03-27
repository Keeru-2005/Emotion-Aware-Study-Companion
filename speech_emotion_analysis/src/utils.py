import sounddevice as sd
from scipy.io.wavfile import write

def record_audio(filename="temp.wav", duration=3, fs=44100):
    print("Recording...")
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
    sd.wait()
    write(filename, fs, recording)
    print("Recording complete")