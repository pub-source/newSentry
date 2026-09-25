"""Static configuration for the MSDS local camera bridge.

Every tunable lives here so the other modules stay import-light and fast.
"""
from __future__ import annotations

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(BASE_DIR, "bin")
IS_WINDOWS = os.name == "nt"

API_PORT = int(os.environ.get("MSD_API_PORT", 5000))
HLS_PORT = int(os.environ.get("MSD_HLS_PORT", 8888))
RTSP_PORT = int(os.environ.get("MSD_RTSP_PORT", 8554))

MAX_CAMERAS = 16
# Length of each WAV segment fed to Whisper. Shorter = more responsive UI.
AUDIO_CHUNK_SECONDS = max(2, int(os.environ.get("MSD_AUDIO_CHUNK_SECONDS", 4)))
WHISPER_MODEL = os.environ.get("MSD_WHISPER_MODEL", "base")


# How long a positive HLS probe stays valid (seconds). Avoids one HTTP request
# per camera on every /status poll — the main cost with 16 cameras.
HLS_PROBE_TTL = 3.0

MEDIAMTX_CONFIG = os.path.join(BASE_DIR, "mediamtx.yml")

DISTRESS_KEYWORDS = {
    # English
    "help": 0.95, "help me": 0.98, "fire": 0.97, "emergency": 0.95,
    "call 911": 0.98, "someone help": 0.97, "i fell": 0.93, "i can't breathe": 0.98,
    "stop": 0.8, "get away": 0.9, "don't hurt me": 0.97, "please stop": 0.92,
    "ambulance": 0.95, "police": 0.9, "i'm hurt": 0.95, "save me": 0.97,
    # Tagalog / Filipino
    "tulong": 0.95, "tulungan mo ako": 0.98, "saklolo": 0.98, "sunog": 0.97,
    "may sunog": 0.98, "nasusunog": 0.97, "nahulog ako": 0.93, "natumba ako": 0.93,
    "hindi ako makahinga": 0.98, "masakit": 0.9, "ang sakit": 0.93,
    "tumawag ka ng pulis": 0.97, "pulis": 0.9, "ambulansya": 0.95,
    "tama na": 0.9, "huwag": 0.85, "wag mo akong saktan": 0.97,
    "iligtas mo ako": 0.97, "may magnanakaw": 0.95, "magnanakaw": 0.93,
    "aray": 0.85, "inaatake ako": 0.97,
    # Extra safety / awareness phrases (English)
    "call for help": 0.97, "send help": 0.97, "i need your help": 0.97,
    "i am in danger": 0.97, "i'm in danger": 0.97, "somebody help": 0.97,
    "i cannot get up": 0.97, "i can't get up": 0.97, "i cannot move": 0.97,
    "gas leak": 0.97, "i smell gas": 0.96, "i smell smoke": 0.93,
    "heart attack": 0.98, "chest pain": 0.97, "he is drowning": 0.99,
    "there is a thief": 0.97, "he has a knife": 0.99, "he has a gun": 0.99,
    "earthquake": 0.96, "leave me alone": 0.92, "let me go": 0.95,
    # Extra safety / awareness phrases (Tagalog)
    "tulungan ako": 0.97, "tulungan ninyo ako": 0.98, "tulungan nyo ako": 0.98,
    "kailangan ko ng tulong": 0.97, "kailangan ng tulong": 0.96,
    "may emergency": 0.96, "hindi ako makatayo": 0.97, "hindi ako makagalaw": 0.97,
    "amoy gas": 0.96, "amoy sunog": 0.93, "may usok": 0.92,
    "nalulunod": 0.98, "nawalan ng malay": 0.98, "dumudugo ako": 0.96,
    "atake sa puso": 0.98, "masakit ang dibdib ko": 0.97,
    "holdap": 0.97, "may pumasok sa bahay": 0.97, "may baril siya": 0.99,
    "may hawak siyang kutsilyo": 0.99, "lindol": 0.95, "may aksidente": 0.95,
    "layuan mo ako": 0.95, "bitawan mo ako": 0.96, "natatakot ako": 0.9,
    "nahulog ang bata": 0.98, "nawawala ang bata": 0.97, "delikado": 0.88,
}


def match_distress(transcript: str):
    text = transcript.lower()
    best, score = "", 0.0
    for kw, conf in DISTRESS_KEYWORDS.items():
        if kw in text and conf > score:
            best, score = kw, conf
    return best, score
