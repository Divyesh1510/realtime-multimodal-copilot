/**
 * Injected Content Script for Chrome Extension.
 * Renders the discreet Floating HUD directly onto LeetCode, Google Meet, or Zoom web.
 * Communicates with the local FastAPI WebSocket gateway.
 */

(function () {
  if (document.getElementById("ai-copilot-hud-root")) return;

  let ws = null;
  let isListening = false;
  let isMinimized = false;

  // 1. Create Floating HUD DOM
  const hudContainer = document.createElement("div");
  hudContainer.id = "ai-copilot-hud-root";
  hudContainer.innerHTML = `
    <div class="hud-header" id="hud-drag-header">
      <div class="hud-title">
        <span class="hud-status-dot offline" id="hud-status-dot"></span>
        <span>AI Copilot</span>
        <select class="hud-mode-selector" id="hud-mode-select" title="Mode Selection">
          <option value="quiz">🎯 Quiz / MCQ (1-line)</option>
          <option value="code">💻 Coding & Explain</option>
        </select>
      </div>
      <div class="hud-actions">
        <div class="hud-opacity-control" title="Adjust Transparency">
          <span>👁️</span>
          <input type="range" id="hud-opacity-slider" class="hud-opacity-slider" min="0.2" max="1" step="0.05" value="0.92">
        </div>
        <button class="hud-btn" id="hud-toggle-screen" title="Share Screen / Quiz tab">🖥️ Screen</button>
        <button class="hud-btn" id="hud-toggle-mic">🎙️ Mic</button>
        <button class="hud-btn" id="hud-force-query" title="Ctrl+Space">⚡ Query</button>
        <button class="hud-btn" id="hud-minimize-btn">_</button>
      </div>
    </div>
    <div class="hud-body" id="hud-body-content">
      <div class="hud-transcript-box" id="hud-transcript-stream">
        <div style="color: #64748b; text-align: center; padding: 6px;">
          Audio/Question transcripts stream here...
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
        <span style="font-weight: 600; font-size: 10px; color: #a5b4fc; text-transform: uppercase;">Direct Answer / Solution:</span>
        <button class="hud-copy-btn" id="hud-copy-btn">📋 Copy Answer</button>
      </div>
      <div class="hud-solution-box" id="hud-solution-stream">
        <span style="color: #64748b;">Direct answers & code appear here automatically or on Ctrl+Space.</span>
      </div>
    </div>
    <div class="hud-footer">
      <span id="hud-status-text">Disconnected</span>
      <span>Ctrl+Space to analyze</span>
    </div>
  `;
  document.body.appendChild(hudContainer);

  const statusDot = document.getElementById("hud-status-dot");
  const statusText = document.getElementById("hud-status-text");
  const micBtn = document.getElementById("hud-toggle-mic");
  const screenBtn = document.getElementById("hud-toggle-screen");
  const queryBtn = document.getElementById("hud-force-query");
  const copyBtn = document.getElementById("hud-copy-btn");
  const opacitySlider = document.getElementById("hud-opacity-slider");
  const modeSelect = document.getElementById("hud-mode-select");
  const minimizeBtn = document.getElementById("hud-minimize-btn");
  const transcriptBox = document.getElementById("hud-transcript-stream");
  const solutionBox = document.getElementById("hud-solution-stream");

  // 2. Connect to FastAPI Gateway (configurable via chrome.storage)
  function connectGateway() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    // Check if user configured a hosted URL (e.g. wss://my-copilot.onrender.com)
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["backendUrl"], (result) => {
        const targetUrl = result.backendUrl || "ws://127.0.0.1:8000";
        initSocket(targetUrl);
      });
    } else {
      initSocket("ws://127.0.0.1:8000");
    }
  }

  function initSocket(baseServerUrl) {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    // Convert http/https to ws/wss if needed
    let wsUrl = baseServerUrl.replace(/^http/, "ws");
    if (!wsUrl.endsWith("/api/ws/chrome-ext-session")) {
      wsUrl = `${wsUrl.replace(/\/$/, "")}/api/ws/chrome-ext-session`;
    }

    statusText.innerText = `Connecting to ${wsUrl}...`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusDot.classList.remove("offline");
      statusText.innerText = "Gateway Connected ($0 Free Tier)";
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transcript") {
        appendTranscript(data.speaker, data.text);
      } else if (data.type === "stream_start") {
        solutionBox.innerHTML = "";
      } else if (data.type === "stream_chunk") {
        solutionBox.innerText += data.delta;
        solutionBox.scrollTop = solutionBox.scrollHeight;
      } else if (data.type === "status") {
        statusText.innerText = data.message;
      }
    };

    ws.onclose = () => {
      statusDot.classList.add("offline");
      statusText.innerText = "Gateway Offline (Run backend)";
      ws = null;
    };
  }

  function appendTranscript(speaker, text) {
    if (transcriptBox.innerText.includes("Connect to gateway")) {
      transcriptBox.innerHTML = "";
    }
    const item = document.createElement("div");
    item.className = "hud-transcript-item";
    item.innerHTML = `<span class="hud-speaker-label">${speaker}:</span> ${escapeHtml(text)}`;
    transcriptBox.appendChild(item);
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
  }

  function escapeHtml(string) {
    return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 3. Audio Streaming from Browser Tab / Mic
  let audioContext = null;

  async function toggleMic() {
    if (isListening) {
      if (audioContext) audioContext.close();
      isListening = false;
      micBtn.classList.remove("active");
      micBtn.innerText = "🎙️ Mic";
      return;
    }

    connectGateway();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext({ sampleRate: 16000 });
      
      const source = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      scriptProcessor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        if (rms < 0.015) return; // Drop silence

        // Pack 16-bit PCM (Channel 1 for remote question simulation or Channel 0)
        const pcm = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm[i] = s < 0 ? s * 32768 : s * 32767;
        }

        const buffer = new Uint8Array(1 + pcm.byteLength);
        buffer[0] = 1; // Channel 1 (Speaker trigger)
        buffer.set(new Uint8Array(pcm.buffer), 1);

        ws.send(buffer.buffer);
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      isListening = true;
      micBtn.classList.add("active");
      micBtn.innerText = "🔴 Listening";
    } catch (err) {
      alert("Microphone permission needed: " + err.message);
    }
  }

  // Opacity Slider Adjustment
  opacitySlider.addEventListener("input", (e) => {
    const val = e.target.value;
    hudContainer.style.background = `rgba(10, 15, 30, ${val})`;
    hudContainer.style.opacity = Math.max(0.4, Number(val) + 0.1);
  });

  // 1-Click Copy Answer
  copyBtn.addEventListener("click", async () => {
    const textToCopy = solutionBox.innerText.trim();
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.innerText = "✅ Copied!";
      setTimeout(() => copyBtn.innerText = "📋 Copy Answer", 1500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  });

  // 4. Screen Capture (For Quiz Tab / Coding Test)
  let screenStream = null;
  let screenVideo = null;
  let screenInterval = null;

  async function toggleScreen() {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      clearInterval(screenInterval);
      screenStream = null;
      screenBtn.classList.remove("active");
      screenBtn.innerText = "🖥️ Screen";
      return;
    }

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 }
      });
      screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.play();

      screenBtn.classList.add("active");
      screenBtn.innerText = "🔴 Screen Live";
      connectGateway();

      // Transmit screen keyframe periodically
      screenInterval = setInterval(() => {
        if (!screenVideo || !ws || ws.readyState !== WebSocket.OPEN) return;
        const canvas = document.createElement("canvas");
        canvas.width = screenVideo.videoWidth || 1280;
        canvas.height = screenVideo.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL("image/jpeg", 0.7);
          ws.send(JSON.stringify({
            type: "screen_keyframe",
            image_base64: base64,
            diff: 10
          }));
        }
      }, 2500);

      screenStream.getVideoTracks()[0].onended = () => {
        toggleScreen();
      };
    } catch (err) {
      console.warn("Screen share cancelled:", err);
    }
  }

  screenBtn.addEventListener("click", toggleScreen);

  // 5. Force Query (Ctrl+Space) with Mode Support
  function triggerForceQuery() {
    connectGateway();
    if (ws && ws.readyState === WebSocket.OPEN) {
      statusText.innerText = "Analyzing question...";
      const mode = modeSelect.value;
      
      let promptText = "";
      if (mode === "quiz") {
        promptText = "Look at the question/quiz on screen. Give the DIRECT, 1-LINE ANSWER or selected choice immediately with zero explanation.";
      } else {
        promptText = "Analyze current screen and code problem. Provide optimal algorithm pattern and concise code solution.";
      }

      ws.send(JSON.stringify({
        type: "hotkey_trigger",
        prompt: promptText
      }));
    }
  }

  // Event Listeners
  micBtn.addEventListener("click", toggleMic);
  queryBtn.addEventListener("click", triggerForceQuery);
  minimizeBtn.addEventListener("click", () => {
    isMinimized = !isMinimized;
    hudContainer.classList.toggle("minimized", isMinimized);
    minimizeBtn.innerText = isMinimized ? "□" : "_";
  });

  // Hotkey listener inside page
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
      e.preventDefault();
      triggerForceQuery();
    }
  });

  // Listen for background messages (commands)
  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg.type === "TOGGLE_HUD") {
      hudContainer.classList.toggle("hidden");
    } else if (msg.type === "FORCE_QUERY") {
      triggerForceQuery();
    }
  });

  // Dragging support
  const dragHeader = document.getElementById("hud-drag-header");
  let isDragging = false, startX, startY, initialX, initialY;

  dragHeader.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = hudContainer.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    hudContainer.style.bottom = "auto";
    hudContainer.style.right = "auto";
    hudContainer.style.left = `${initialX + dx}px`;
    hudContainer.style.top = `${initialY + dy}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Auto connect when injected
  connectGateway();
})();
