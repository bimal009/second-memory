import wave
from dataclasses import dataclass
from pathlib import Path

import av

SAMPLE_RATE = 16000
MAX_IMAGES=8
KEY_FRAME_INTERVAL=2.5
@dataclass
class MediaInfo:
    kind: str  # "video" | "audio" | "image"
    width: int
    height: int
    duration: float
    has_audio: bool


def probe(path: Path) -> MediaInfo:
    with av.open(str(path)) as c:
        video, audio = c.streams.video, c.streams.audio
        if not (video or audio):
            raise ValueError("no audio or video stream")

        width = video[0].width if video else 0
        height = video[0].height if video else 0

        fmt = c.format.name
        if video and ("image2" in fmt or "_pipe" in fmt or "webp" in fmt):
            return MediaInfo("image", width, height, 0.0, False)

        duration = (c.duration or 0) / av.time_base
        if duration <= 0:
            raise ValueError("unknown duration")

        return MediaInfo("video" if video else "audio", width, height, duration, bool(audio))


def to_wav(path: Path, out: Path | None = None) -> Path:
    out = out or path.with_name(f"{path.stem}_audio.wav")
    if path.resolve() == out.resolve():
        raise ValueError("output must differ from input")

    resampler = av.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
    with av.open(str(path)) as c, wave.open(str(out), "wb") as w:
        if not c.streams.audio:
            raise ValueError("no audio stream")
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        for frame in (*c.decode(audio=0), None):  # None flushes the resampler
            for f in resampler.resample(frame):
                w.writeframes(f.to_ndarray().tobytes())
    return out


def to_key_frames(path: Path, out: Path) -> Path:
    with av.open(str(path)) as c:
        video=c.streams.video[0]
        if not video:
            raise ValueError("no video stream")


from pathlib import Path

import av
import imagehash


def _cap(items: list, limit: int) -> list:
    if len(items) <= limit:
        return items
    idx = [round(i * (len(items) - 1) / (limit - 1)) for i in range(limit)]
    return [items[i] for i in idx]


def sample_frames(
    path: Path,
    out_dir: Path,
    step: float = 2.5,
    max_frames: int = 8,
    dup_bits: int = 5,  # lenient: 0-5 differing bits = same scene
) -> list[tuple[float, Path]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    kept = []  # (time, PIL image)

    with av.open(str(path)) as c:
        stream = c.streams.video[0]
        next_t = 0.0
        prev_hash = None
        last = None

        for frame in c.decode(stream):
            t = float(frame.time or 0.0)
            img = frame.to_image()
            last = (t, img)
            if t < next_t:
                continue
            while next_t <= t:
                next_t += step

            h = imagehash.dhash(img)
            if prev_hash is not None:
                dist = h - prev_hash
                # print(f"t={t:.1f}s dist={dist}")  # uncomment to tune
                if dist <= dup_bits:
                    continue
            prev_hash = h
            kept.append((t, img))

        if last and (not kept or last[0] > kept[-1][0]):
            kept.append(last)

    kept = _cap(kept, max_frames)

    out = []
    for i, (t, img) in enumerate(kept):
        p = out_dir / f"frame_{i:02d}.jpg"
        img.convert("RGB").save(p, quality=85)
        out.append((t, p))
    return out