# Chrome Web Store Publishing Guide for AI Interview & Meeting Copilot

To publish this extension to the **Chrome Web Store** so that anyone across the world can install it with one click, follow this complete, step-by-step roadmap.

---

## 1. Architectural Prerequisite: Self-Hosted vs. Cloud Backend

Currently, the extension connects to `ws://localhost:8000`. For public users who don't run code on their terminal, you have two options:

### Option A: Bring-Your-Own-Key (BYOK) Client-Side Settings (Zero Hosting Cost)
Add a Settings modal in the extension popup where users input their own free Groq/OpenRouter API key. The extension talks directly to the AI APIs over HTTPS/WSS without you having to pay for server hosting.

### Option B: Deploy Backend to Free/Low-Cost Cloud
Deploy the FastAPI backend to a free/cheap cloud container:
- **Render.com / Railway / Fly.io / Modal**:
  - Deploy `backend/` with Docker.
  - Update `extension/scripts/content.js` WebSocket URL from `ws://127.0.0.1:8000` to `wss://your-copilot-backend.onrender.com`.

---

## 2. Chrome Web Store Preparation Checklist

### A. Convert SVG Icons to PNGs (Mandatory)
Chrome Web Store requires static PNG icons in sizes:
- `16x16` (favicon)
- `48x48` (extension management page)
- `128x128` (Web Store installation page)

Place these in `extension/icons/icon16.png`, `icon48.png`, `icon128.png`.

Update [`manifest.json`](file:///d:/Reddy-dev/Resume%20Projects/realtime-multimodal-copilot/extension/manifest.json):
```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
},
"action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### B. Privacy Policy (Mandatory)
Because the extension uses `tabCapture` / `microphone`, Google Web Store review **strictly requires** a public Privacy Policy URL.
- Create a free GitHub Gist or GitHub Pages site stating:
  > *"This extension processes audio and screen frames in real time solely to generate technical interview feedback. No biometric voiceprints or personal data are stored or sold to third parties."*

### C. Permissions Justification
In the Web Store developer dashboard, explain why you need each permission:
- `activeTab`: To inject the HUD overlay onto the coding platform.
- `scripting`: To coordinate keystroke events and floating modal controls.
- `storage`: To persist user settings (e.g. HUD position, API keys).

---

## 3. Step-by-Step Publishing Steps

### Step 1: Register Chrome Web Store Developer Account
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. Pay the **one-time $5 registration fee** (Google's anti-spam developer verification fee).

### Step 2: Bundle Extension into a ZIP File
Do **not** zip the parent folder; zip the **contents** of `extension/` directly:
- Files to include in `extension.zip`:
  - `manifest.json`
  - `popup.html`
  - `icons/`
  - `scripts/`

PowerShell command:
```powershell
Compress-Archive -Path "d:\Reddy-dev\Resume Projects\realtime-multimodal-copilot\extension\*" -DestinationPath "d:\Reddy-dev\Resume Projects\realtime-multimodal-copilot\copilot-extension.zip" -Force
```

### Step 3: Upload and Fill Store Listing
1. In the Developer Console, click **"New Item"**.
2. Upload `copilot-extension.zip`.
3. Fill in the **Store Listing**:
   - **Title:** `AI Real-Time Interview & Meeting Copilot`
   - **Summary:** `Discreet multimodal AI copilot that assists with technical coding interviews and algorithms in real time.`
   - **Detailed Description:** Outline features like dual-channel audio, LeetCode HUD injection, hotkeys (`Ctrl+Space`), and privacy-first design.
   - **Screenshots:** Upload 1280x800 screenshots of the HUD overlay floating on LeetCode/VS Code.
   - **Promotional Tile:** 440x280 image.

### Step 4: Submit for Review
1. Fill out the **Privacy Tab** (paste your privacy policy link).
2. Click **Submit for Review**.
3. Review typically takes **24 to 72 hours**. Once approved, your extension receives a public Chrome Web Store URL that anyone can install with one click!
