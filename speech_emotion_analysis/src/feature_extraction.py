import librosa
import numpy as np

def extract_features(file_path, max_len=130):
    audio, sr = librosa.load(file_path, duration=3, offset=0.5)

    # Normalize
    audio = audio / np.max(np.abs(audio))

    # Trim silence
    audio, _ = librosa.effects.trim(audio)

    # MFCC (2D)
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)

    # Pad or trim
    if mfcc.shape[1] < max_len:
        pad_width = max_len - mfcc.shape[1]
        mfcc = np.pad(mfcc, ((0, 0), (0, pad_width)))
    else:
        mfcc = mfcc[:, :max_len]

    return mfcc