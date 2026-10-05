# Free Cloud Deployment Guide for AI Interview Copilot

This guide outlines how to host your **FastAPI Backend Gateway** and **Next.js Frontend** for **$0 / free** so they run 24/7 in the cloud without keeping your local laptop on.

---

## 🌟 Recommended Free Cloud Architecture

| Component | Recommended Free Host | URL Format |
| :--- | :--- | :--- |
| **Backend Gateway (FastAPI + WebSockets)** | **Render.com** (Free Tier Web Service) or **Railway** / **Koyeb** | `https://realtime-copilot-api.onrender.com`<br>*(WebSocket: `wss://realtime-copilot-api.onrender.com`)* |
| **Frontend Studio (Next.js)** | **Vercel** (Free Tier) | `https://realtime-copilot.vercel.app` |
| **Chrome Extension** | Runs directly in Chrome | Configured to point to the `wss://` Render URL |

---

## 1. Hosting the Backend on Render.com (100% Free)

We already configured [`render.yaml`](file:///d:/Reddy-dev/Resume%20Projects/realtime-multimodal-copilot/render.yaml) and [`backend/Dockerfile`](file:///d:/Reddy-dev/Resume%20Projects/realtime-multimodal-copilot/backend/Dockerfile).

### Step-by-Step:
1. **Push your code to GitHub**:
   - Create a GitHub repository (e.g. `realtime-multimodal-copilot`).
   - Push your workspace files.
2. **Go to [Render.com](https://render.com)**:
   - Sign up/log in with GitHub.
   - Click **New +** $\rightarrow$ **Web Service**.
   - Select your GitHub repo.
3. **Configure the Service**:
   - **Name:** `realtime-copilot-backend`
   - **Environment:** `Docker` (or Python)
   - **Root Directory:** `backend`
   - **Instance Type:** `Free`
4. **Add Environment Variables** (Under the "Environment" tab):
   - `GROQ_API_KEY` = *your_groq_api_key*
   - `OPENROUTER_API_KEY` = *your_openrouter_api_key*
   - `GROQ_TEXT_MODEL` = `qwen/qwen3.8-27b`
   - `GROQ_WHISPER_MODEL` = `whisper-large-v3-turbo`
   - `OPENROUTER_VISION_MODEL` = `openrouter/free`
   - `OPENROUTER_TEXT_MODEL` = `openrouter/free`
5. **Click "Deploy Web Service"**:
   - Render will build the Docker container and provide a live URL, e.g.:
     `https://realtime-copilot-backend.onrender.com`
   - The WebSocket endpoint is immediately active at:
     `wss://realtime-copilot-backend.onrender.com/api/ws/chrome-ext-session`

---

## 2. Hosting the Frontend on Vercel (100% Free)

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select your repository.
4. Set **Root Directory** to `frontend`.
5. Click **Deploy**.
6. Within 60 seconds, your interactive web studio is live on `https://your-project.vercel.app`!

---

## 3. Connecting the Chrome Extension to your Cloud Backend

Once your backend is live on Render:
1. Click the **AI Copilot** puzzle icon in your Chrome toolbar.
2. In the **Backend Gateway URL** field, replace `ws://127.0.0.1:8000` with:
   ```
   wss://realtime-copilot-backend.onrender.com
   ```
3. Click **Save**.
4. Now the floating HUD works on **any computer, anywhere in the world** without running a local terminal!
