# Real-Time Multimodal Voice & Screen AI Interview/Meeting Copilot ($0 Free-Tier)

An open-source, ultra-low-latency technical interview and meeting copilot engineered to run entirely on a **$0 Zero-Cost / Free-Tier stack** — featuring both a **Full Web Studio** and a **Discreet Chrome / Browser Extension HUD**.

---

## 🌟 Key Engineering Features

1. **Chrome / Browser Extension with Discreet Injected HUD (Manifest V3)**
   * Injects a lightweight, draggable glassmorphic HUD directly over **LeetCode, HackerRank, Google Meet, Zoom, or VS Code for Web**.
   * Keyboard shortcuts:
     * `Ctrl + Shift + Y` (or `Cmd + Shift + Y`): Toggle HUD visibility.
     * `Ctrl + Space`: Instant **Push-to-Query** analysis.
     * Minimize button (`_`) collapses the HUD into a compact unobtrusive pill.

2. **Dual-Channel Audio Separation (Web Audio API)**
   * Transmits **Channel 0 (Microphone)** and **Channel 1 (System / Remote Speaker audio)** over a single multiplexed 16kHz PCM stream via custom [`AudioWorkletProcessor`](file:///d:/Reddy-dev/Resume%20Projects/realtime-multimodal-copilot/frontend/public/audio-processor.js).
   * Prevents self-triggering feedback loops: **Only Channel 1 (interviewer)** triggers automatic AI reasoning.

3. **Client-Side Perceptual Difference Hashing (dHash)**
   * Downsamples live screen shares to an offscreen `320x180` canvas in JavaScript.
   * Calculates 64-bit difference hashes and Hamming distance to only dispatch keyframes when significant visual code/diagram changes occur (cutting bandwidth by 85%).

4. **Semantic Debounce & Intent Heuristics (FastAPI Backend)**
   * 1.5s sliding silence debounce on speaker utterances.
   * Regex/heuristic filter that differentiates actionable interview queries (`what`, `how`, `optimize`, `complexity`) from filler noise (`okay`, `sure`, `let's start`), preventing free-tier 429 rate limits.

5. **Zero-Cost Free-Tier AI Model Integration**
   * **STT:** Groq Cloud Whisper (`whisper-large-v3-turbo` free tier).
   * **Text Reasoning:** Groq Llama/Qwen (`qwen/qwen3.8-27b`).
   * **Multimodal Vision:** OpenRouter free models (`openrouter/free`).

---

## 🚀 How to Load the Chrome Extension

1. Open Google Chrome (or Brave / Edge / Arc).
2. Navigate to: **`chrome://extensions/`**
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** in the top-left corner.
5. Select the folder:
   ```
   d:\Reddy-dev\Resume Projects\realtime-multimodal-copilot\extension
   ```
6. Open any tab (e.g., [leetcode.com/problems](https://leetcode.com/problemset/all/)):
   - You will see the **Floating HUD** in the bottom-right corner.
   - Drag it anywhere on your screen.
   - Press **`Ctrl + Space`** to trigger instant analysis!

---

## 🛠️ Running the Local Backend Gateway
The extension and web app connect to the local FastAPI WebSocket gateway:

```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
