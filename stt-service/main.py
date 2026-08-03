from fastapi import FastAPI, File, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()

model = None


@app.on_event("startup")
def load_model() -> None:
    global model
    model = WhisperModel(
        "base",
        device="cpu",
        compute_type="int8",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(audio: UploadFile = File(...)) -> dict[str, str]:
    global model

    if model is None:
        raise RuntimeError("Model not loaded")

    contents = audio.file.read()
    temp_path = "./temp_audio.wav"
    with open(temp_path, "wb") as f:
        f.write(contents)

    segments, _ = model.transcribe(temp_path, beam_size=5)
    text = " ".join(segment.text for segment in segments)

    return {"text": text}
