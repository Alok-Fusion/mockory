# Rory Mock Interview

> **A local-first, privacy-respecting self mock interview web platform powered by local LLMs (Ollama), faster-whisper STT, and Kokoro-ONNX TTS.**

Rory is your AI interviewer. Paste a Job Description (JD) and your Resume (or upload PDF/DOCX/TXT), select your target rounds (Technical, Coding Discussion, System Design, HR, Engineering Manager, Behavioral STAR, Culture Fit, Case Study), and practice answering via voice, text, or both. Get real-time delivery analytics (WPM, fillers, pauses), instant per-turn feedback, first-person improved answers, and a final comprehensive evaluation report with a prioritized study plan.

---

## Architecture & Features

- **Small Model Architecture**: Optimized for lightweight local models (default `qwen2.5:3b`, swappable with `llama3:latest`). Uses compressed JD (<250 words) and Resume (<300 words) briefs, compact rolling summaries (<100 words), modular single-responsibility prompts, strict JSON schema validation with a 3-attempt repair loop, and deterministic fallback objects.
- **Multimodal Answer Ingestion**: Simultaneous live voice recording (MediaRecorder WebM/Opus -> faster-whisper) and typed text input with intelligent answer merging.
- **Delivery Analytics**: Computes Words Per Minute (WPM), filler word counts (`um, uh, like, you know, basically, actually, so, kind of`), 2s+ pause detection, and false starts in pure Python code.
- **Animated 2D & 3D Avatars**:
  - **2D Avatar (Default)**: Layered SVG/Canvas illustrated interviewer with natural breathing, random blinking, head sway, listening nod, thinking tilt, and Web Audio AnalyserNode frequency-based lip sync (closed, small, wide, round, open).
  - **Custom 2D Image Override**: Drop `rory_idle.png` along with `mouth_small.png`, `mouth_wide.png`, `mouth_round.png`, `mouth_open.png` into `frontend/public/avatar2d/` to use your own custom character artwork.
  - **3D Avatar (Optional)**: Three.js / VRM model loaded from `frontend/public/models/rory.vrm` with blendshape lip-sync (`aa, ih, ou, ee, oh`). Automatically falls back to the 2D avatar if the VRM file is absent.
- **Final Report & Export**: Overall score, per-round scores, interactive skill radar chart, top 5 recurring mistakes, JD skill gap study guide, turn retrospective, and 1-click export to Markdown and PDF.

---

## Quick Start (Windows)

### 1. Prerequisites
1. **Ollama**: Ensure [Ollama](https://ollama.com/) is installed and running. Pull the default models:
   ```bash
   ollama pull qwen2.5:3b
   ollama pull llama3:latest
   ```
2. **FFmpeg**: Ensure `ffmpeg` is installed and accessible in your system `PATH`.
   - On Windows (winget): `winget install Gyan.FFmpeg`
   - Or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add `bin/` to your PATH.
3. **Python 3.10+** & **Node.js 18+**

### 2. Automated One-Click Launch (Windows)
Double-click `start_all.bat` or run:
```cmd
start_all.bat
```
This automatically sets up Python virtual environments, launches the FastAPI server on `http://127.0.0.1:8000`, starts the React Vite frontend on `http://localhost:5173`, and opens your browser.

---

## Manual Installation & Run Steps

### Backend Setup (Python FastAPI)
```bash
# 1. Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. (Optional) Download Kokoro ONNX weights for local TTS:
# Kokoro ONNX model files can be placed in backend/data/models_cache/:
# - kokoro-v0_19.onnx
# - voices.bin
# If omitted, Rory automatically uses high-quality browser SpeechSynthesis.

# 4. Start backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup (React + Vite + TypeScript)
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Configuration (`.env`)

Configuration settings are loaded from `.env` in the root directory:

```env
# Ollama LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_INTERVIEW=qwen2.5:3b
OLLAMA_MODEL_EVAL=qwen2.5:3b

# Model Context Limits & Sampling
OLLAMA_NUM_CTX_INTERVIEW=4096
OLLAMA_NUM_CTX_EVAL=8192
TEMPERATURE_INTERVIEW=0.7
TEMPERATURE_EVAL=0.2

# Audio Settings
WHISPER_MODEL_SIZE=base.en
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
KOKORO_VOICE=af_heart

# Server Configuration
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
DATABASE_URL=sqlite:///./backend/data/rory_mock.db
```

To switch evaluation to `llama3:latest`, update `.env`:
```env
OLLAMA_MODEL_EVAL=llama3:latest
```

---

## Customizing Avatars

### Custom 2D Image Assets
Place the following image files in `frontend/public/avatar2d/`:
- `rory_idle.png` (Base character pose)
- `mouth_small.png`
- `mouth_wide.png`
- `mouth_round.png`
- `mouth_open.png`
- `mouth_closed.png`

### 3D VRM Character
To use a 3D character:
1. Create or download any `.vrm` character from [VRoid Studio](https://vroid.com/en/studio) (free) or [VRoid Hub](https://hub.vroid.com/).
2. Place the file at `frontend/public/models/rory.vrm`.
3. Toggle "Avatar: 3D" in the top navbar or Setup screen.

---

## Design Decisions & Technical Notes

1. **Small Model Context Compression**: Raw JDs and Resumes often exceed 3B model attention capacity when repeated across turns. Generating persistent `<250w` JD briefs and `<300w` Resume briefs on session start ensures high question quality and strict adherence to facts throughout long 10+ turn interviews.
2. **Deterministic Code Metrics**: Mathematical stats (WPM, pause detection, filler counts, question similarity deduplication) are calculated in Python rather than requested from the LLM, preventing hallucinated performance metrics.
3. **Split Evaluation Pipeline**: Turn evaluations are split into Parallel Stage A (Scores + Verdict) and Stage B (Mistakes + Missing Points), followed by Stage C (Improved Answer in user voice + Pro Tip). This prevents output degradation on smaller LLMs.
4. **Graceful Degradation**: If Kokoro ONNX model files are not yet in cache, the system automatically uses browser SpeechSynthesis. If faster-whisper is unavailable, Web Speech API provides real-time fallback. If Ollama is offline or a model is missing, an explicit error banner displays the exact command to fix it.

---

## Running Automated Tests

Run backend unit tests for delivery metrics, question deduplication, schema repair, and decision logic:
```bash
.venv\Scripts\python -m pytest backend/tests
```
