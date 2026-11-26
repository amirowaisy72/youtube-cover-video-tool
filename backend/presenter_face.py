"""The presenter photo: find the faces, say what is wrong with it, take out the chosen person and cut them out.

YuNet finds the faces, MediaPipe gives the 478 face points, Robust Video Matting cuts the person out.
Pictures are RGB uint8 arrays (height, width, 3).
"""
from __future__ import annotations

import math
import threading

import numpy as np
from PIL import Image

import presenter_models as models

MAX_SIDE = 1280          # the presenter picture used from here on
_sessions: dict = {}
_lock = threading.Lock()


def session(name: str, threads: int = 0):
    """One loaded model per file (kept until release())."""
    import onnxruntime as ort
    key = str(models.folder() / name)
    with _lock:
        if key not in _sessions:
            so = ort.SessionOptions()
            so.log_severity_level = 3
            if threads:
                so.intra_op_num_threads = threads
            _sessions[key] = ort.InferenceSession(str(models.path(name)), so, providers=["CPUExecutionProvider"])
        return _sessions[key]


def release() -> None:
    """Free the memory of the loaded models."""
    with _lock:
        _sessions.clear()


def resize(img: np.ndarray, size: tuple[int, int], how=Image.LANCZOS) -> np.ndarray:
    return np.asarray(Image.fromarray(img).resize(size, how))


# ------------------------------------------------------------------ faces (YuNet)
def _nms(found: list[dict], overlap: float = 0.35) -> list[dict]:
    found.sort(key=lambda f: -f["score"])
    keep: list[dict] = []
    for f in found:
        x, y, w, h = f["box"]
        for k in keep:
            a, b, c, d = k["box"]
            inter = max(0.0, min(x + w, a + c) - max(x, a)) * max(0.0, min(y + h, b + d) - max(y, b))
            if inter / (w * h + c * d - inter + 1e-6) > overlap:
                break
        else:
            keep.append(f)
    return keep


def faces(img: np.ndarray, minimum: float = 0.7) -> list[dict]:
    """[{box: [x, y, w, h], eyes/nose/mouth points: kps (5, 2), score}] biggest first."""
    h, w = img.shape[:2]
    scale = 640 / max(h, w)
    small = resize(img, (max(1, round(w * scale)), max(1, round(h * scale))), Image.BILINEAR)
    canvas = np.zeros((640, 640, 3), np.float32)
    canvas[:small.shape[0], :small.shape[1]] = small[:, :, ::-1]  # the model wants blue-green-red
    sess = session("yunet.onnx")
    names = [o.name for o in sess.get_outputs()]
    out = dict(zip(names, sess.run(None, {sess.get_inputs()[0].name: canvas.transpose(2, 0, 1)[None]})))
    found = []
    for stride in (8, 16, 32):
        side = 640 // stride
        score = np.sqrt(np.clip(out[f"cls_{stride}"][0, :, 0], 0, 1) * np.clip(out[f"obj_{stride}"][0, :, 0], 0, 1))
        for i in np.nonzero(score >= minimum)[0]:
            row, col = divmod(int(i), side)
            bx, by, bw, bh = out[f"bbox_{stride}"][0, i]
            cx, cy = (col + bx) * stride, (row + by) * stride
            bw, bh = math.exp(bw) * stride, math.exp(bh) * stride
            kps = (out[f"kps_{stride}"][0, i].reshape(5, 2) + (col, row)) * stride
            found.append({"score": float(score[i]), "box": [float((cx - bw / 2) / scale), float((cy - bh / 2) / scale),
                                                           float(bw / scale), float(bh / scale)], "kps": kps / scale})
    keep = _nms(found)
    keep.sort(key=lambda f: -f["box"][2] * f["box"][3])
    return keep


def mesh(img: np.ndarray, face: dict) -> np.ndarray:
    """MediaPipe Face Mesh: 478 points of one face, in picture pixels, (478, 2)."""
    if not models.add_libraries():
        raise RuntimeError("MediaPipe is not installed. In the Photo step press “Set up the presenter”.")
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    x, y, w, h = face["box"]
    side = int(max(w, h) * 2.0)
    left, top = int(x + w / 2 - side / 2), int(y + h / 2 - side / 2)
    crop = np.zeros((side, side, 3), np.uint8)  # the face alone, so small faces are read well
    x0, y0 = max(0, left), max(0, top)
    x1, y1 = min(img.shape[1], left + side), min(img.shape[0], top + side)
    crop[y0 - top:y1 - top, x0 - left:x1 - left] = img[y0:y1, x0:x1]
    options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_buffer=models.path("face_landmarker.task").read_bytes()),
        num_faces=1, min_face_detection_confidence=0.3, min_face_presence_confidence=0.3)
    with vision.FaceLandmarker.create_from_options(options) as finder:
        found = finder.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(crop)))
    if not found.face_landmarks:
        raise ValueError("The face could not be read. Use a sharper photo where the person looks at the camera.")
    return np.array([[p.x * side + left, p.y * side + top] for p in found.face_landmarks[0]], np.float64)


# ------------------------------------------------------------------ checking a photo
def judge(img: np.ndarray, found: list[dict]) -> list[dict]:
    """Per face: where it is and what is wrong with it, in plain words."""
    out = []
    for i, f in enumerate(found):
        x, y, w, h = f["box"]
        eye_a, eye_b, nose = sorted([f["kps"][0], f["kps"][1]], key=lambda p: p[0]) + [f["kps"][2]]
        span = float(np.hypot(*(eye_b - eye_a))) or 1.0
        mid = (eye_a + eye_b) / 2
        roll = math.degrees(math.atan2(eye_b[1] - eye_a[1], eye_b[0] - eye_a[0]))
        along = float(np.dot(nose - mid, (eye_b - eye_a) / span)) / span  # nose off the middle: the head is turned
        warnings, usable = [], True
        if w < 70:
            warnings.append("The face is too small to animate. Use a closer or larger photo.")
            usable = False
        elif w < 140:
            warnings.append("The face is small: the mouth may look soft. A closer or larger photo is better.")
        if abs(along) > 0.35 or span < 0.25 * w:
            warnings.append("The head is turned sideways. A photo looking at the camera works much better.")
        if abs(roll) > 20:
            warnings.append("The head is tilted a lot. An upright head works better.")
        if y < 0.01 * img.shape[0] or x < 0 or x + w > img.shape[1]:
            warnings.append("The head touches the edge of the photo. Leave some space around it.")
        out.append({"index": i, "box": [round(v) for v in f["box"]], "warnings": warnings, "usable": usable,
                    "score": round(f["score"], 2)})
    return out


def person_area(shape: tuple[int, int], found: list[dict], index: int) -> tuple[int, int, int, int]:
    """(left, top, right, bottom) of the chosen person: room above the head, the body below, no neighbours."""
    height, width = shape
    x, y, w, h = found[index]["box"]
    cx = x + w / 2
    left, right = cx - 3.0 * w, cx + 3.0 * w
    for k, other in enumerate(found):
        if k == index or other["box"][2] < 0.4 * w:
            continue
        ocx = other["box"][0] + other["box"][2] / 2
        if ocx < cx:
            left = max(left, (ocx + cx) / 2)
        else:
            right = min(right, (ocx + cx) / 2)
    left, right = max(0, int(left)), min(width, int(math.ceil(right)))
    top = max(0, int(y - 1.0 * h))
    bottom = min(height, int(y + 7.5 * h))
    return left, top, right, bottom


def prepare(img: np.ndarray, index: int = 0) -> tuple[np.ndarray, dict]:
    """The chosen person's picture (at most MAX_SIDE, even sides) and their face in it."""
    found = faces(img)
    if not found:
        raise ValueError("No face was found. Use a clear photo where the person looks at the camera.")
    index = max(0, min(index, len(found) - 1))
    left, top, right, bottom = person_area(img.shape[:2], found, index)
    part = img[top:bottom, left:right]
    scale = min(1.0, MAX_SIDE / max(part.shape[:2]))
    size = (max(2, int(part.shape[1] * scale) // 2 * 2), max(2, int(part.shape[0] * scale) // 2 * 2))
    out = resize(part, size)
    face = found[index]
    k = np.array([size[0] / part.shape[1], size[1] / part.shape[0]])
    moved = {"score": face["score"], "kps": (face["kps"] - (left, top)) * k,
             "box": [(face["box"][0] - left) * k[0], (face["box"][1] - top) * k[1], face["box"][2] * k[0], face["box"][3] * k[1]]}
    return out, moved


# ------------------------------------------------------------------ cutting the person out (Robust Video Matting)
class Matter:
    """Call it with the frames of one clip in order: it remembers the earlier ones, so edges stay steady."""

    def __init__(self):
        self.sess = session("rvm.onnx")
        self.reset()

    def reset(self) -> None:
        self.state = [np.zeros((1, 1, 1, 1), np.float32) for _ in range(4)]

    def __call__(self, img: np.ndarray) -> np.ndarray:
        """-> how solid each pixel is, uint8 (height, width)."""
        src = img.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
        ratio = np.array([min(1.0, 640 / max(img.shape[:2]))], np.float32)
        feed = {"src": src, "downsample_ratio": ratio, **{f"r{k + 1}i": self.state[k] for k in range(4)}}
        names = [o.name for o in self.sess.get_outputs()]
        out = dict(zip(names, self.sess.run(None, feed)))
        self.state = [out[f"r{k + 1}o"] for k in range(4)]
        return (np.clip(out["pha"][0, 0], 0, 1) * 255 + 0.5).astype(np.uint8)

    def still(self, img: np.ndarray, rounds: int = 8) -> np.ndarray:
        self.reset()
        alpha = None
        for _ in range(rounds):
            alpha = self(img)
        return alpha


def bounds(alpha: np.ndarray, pad: int = 12) -> tuple[int, int, int, int]:
    """(left, top, right, bottom) around the solid pixels, even sides."""
    ys, xs = np.nonzero(alpha > 40)
    h, w = alpha.shape
    if not len(xs):
        return 0, 0, w, h
    left, right = max(0, int(xs.min()) - pad), min(w, int(xs.max()) + 1 + pad)
    top, bottom = max(0, int(ys.min()) - pad), min(h, int(ys.max()) + 1 + pad)
    if (right - left) % 2:
        left, right = (left - 1, right) if left else (left, right - 1)
    if (bottom - top) % 2:
        top, bottom = (top - 1, bottom) if top else (top, bottom - 1)
    return left, top, right, bottom
