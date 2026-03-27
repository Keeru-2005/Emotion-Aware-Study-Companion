import librosa
import numpy as np

def extract_features(file_path):
    audio, sr = librosa.load(file_path, duration=3, offset=0.5)
    audio = audio / np.max(np.abs(audio))
    audio, _ = librosa.effects.trim(audio)
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)
    chroma = np.mean(librosa.feature.chroma_stft(y=audio, sr=sr).T, axis=0)
    mel = np.mean(librosa.feature.melspectrogram(y=audio, sr=sr).T, axis=0)

    return np.hstack((mfcc, chroma, mel))