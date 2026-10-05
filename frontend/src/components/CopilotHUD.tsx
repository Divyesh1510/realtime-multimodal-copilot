"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Monitor, MonitorOff, Zap, ShieldAlert, Sparkles, Terminal } from "lucide-react";
import { ScreenFrameHasher } from "@/lib/dhash";
import { useHotkeyListener } from "@/hooks/useHotkeyListener";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function CopilotHUD() {
  const [isConnected, setIsConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("System Standby. Click start to connect.");
  
  // Real-time streams
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasherRef = useRef<ScreenFrameHasher>(new ScreenFrameHasher());
  const frameIntervalRef = useRef<any>(null);

  // Initialize WebSocket connection
  const connectWebSocket = () => {
    if (socketRef.current) return;
    const ws = new WebSocket("ws://localhost:8000/api/ws/session-demo-01");
    
    ws.onopen = () => {
      setIsConnected(true);
      setStatusMessage("Connected to Copilot Gateway");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transcript") {
        setLiveTranscript((prev) => [...prev.slice(-10), { speaker: data.speaker, text: data.text }]);
      } else if (data.type === "status") {
        setStatusMessage(data.message);
      } else if (data.type === "stream_start") {
        setIsStreaming(true);
        setStreamingResponse("");
      } else if (data.type === "stream_chunk") {
        setStreamingResponse((prev) => prev + data.delta);
      } else if (data.type === "stream_end") {
        setIsStreaming(false);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatusMessage("Disconnected from Gateway");
      socketRef.current = null;
    };

    socketRef.current = ws;
  };

  // Start Mic & Dual Audio Stream
  const toggleAudio = async () => {
    if (micActive) {
      audioContextRef.current?.close();
      setMicActive(false);
      return;
    }

    try {
      connectWebSocket();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      await audioCtx.audioWorklet.addModule("/audio-processor.js");

      // Ingest User Mic (Channel 0)
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSource = audioCtx.createMediaStreamSource(micStream);
      const userWorkletNode = new AudioWorkletNode(audioCtx, "pcm-downsampler-processor", {
        processorOptions: { channelId: 0 }
      });

      userWorkletNode.port.onmessage = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(e.data); // Binary ArrayBuffer
        }
      };

      micSource.connect(userWorkletNode);
      setMicActive(true);
      setStatusMessage("Dual audio recording live");
    } catch (err: any) {
      console.error("Audio capture failed:", err);
      setStatusMessage(`Audio capture error: ${err.message}`);
    }
  };

  // Start Screen Capture & dHash Keyframe Detection
  const toggleScreen = async () => {
    if (screenActive) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      setScreenActive(false);
      return;
    }

    try {
      connectWebSocket();
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: true // Also capture tab/speaker audio
      });

      const video = document.createElement("video");
      video.srcObject = screenStream;
      video.play();
      screenVideoRef.current = video;

      // Handle system audio from screen share (Channel 1: Interviewer)
      const audioTracks = screenStream.getAudioTracks();
      if (audioTracks.length > 0 && audioContextRef.current) {
        const sysStream = new MediaStream([audioTracks[0]]);
        const sysSource = audioContextRef.current.createMediaStreamSource(sysStream);
        const sysWorkletNode = new AudioWorkletNode(audioContextRef.current, "pcm-downsampler-processor", {
          processorOptions: { channelId: 1 }
        });

        sysWorkletNode.port.onmessage = (e) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(e.data);
          }
        };

        sysSource.connect(sysWorkletNode);
      }

      // Start dHash screen sampling loop (every 1s)
      frameIntervalRef.current = setInterval(() => {
        if (!screenVideoRef.current) return;
        const result = hasherRef.current.computeDHash(screenVideoRef.current);
        if (result.isKeyframe && socketRef.current?.readyState === WebSocket.OPEN) {
          const fullWebP = hasherRef.current.captureFullFrame(screenVideoRef.current);
          socketRef.current.send(JSON.stringify({
            type: "screen_keyframe",
            diff: result.hammingDistance,
            image_base64: fullWebP
          }));
        }
      }, 1000);

      setScreenActive(true);
    } catch (err: any) {
      console.error("Screen capture failed:", err);
      setStatusMessage(`Screen capture cancelled or error: ${err.message}`);
    }
  };

  // Manual Hotkey Trigger (Ctrl + Space)
  const triggerManualQuery = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setStatusMessage("Cannot trigger hotkey: WebSocket offline");
      return;
    }
    socketRef.current.send(JSON.stringify({
      type: "hotkey_trigger",
      prompt: "Manual override: Analyze screen context and problem statement"
    }));
  };

  useHotkeyListener({ onTrigger: triggerManualQuery, enabled: true });

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans p-4 gap-4 select-none">
      {/* Top Bar / Status Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-wide">Real-Time Multimodal Copilot</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-rose-500"}`} />
              <span>{isConnected ? "Gateway Online ($0 Free-Tier)" : "Gateway Disconnected"}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              micActive
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {micActive ? <Mic className="w-3.5 h-3.5 text-rose-400" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
            {micActive ? "Mic Active (Ch 0)" : "Enable Mic"}
          </button>

          <button
            onClick={toggleScreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              screenActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {screenActive ? <Monitor className="w-3.5 h-3.5 text-emerald-400" /> : <MonitorOff className="w-3.5 h-3.5 text-slate-400" />}
            {screenActive ? "Screen + Speaker (Ch 1)" : "Share Screen"}
          </button>

          <button
            onClick={triggerManualQuery}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition shadow"
            title="Press Ctrl+Space anywhere"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>Force Query (Ctrl+Space)</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Left Transcript / Right AI Suggestions HUD */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column: Live Audio Stream Transcripts */}
        <div className="col-span-5 flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden p-3.5 gap-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Live Dual-Channel Transcript
            </span>
            <span className="text-[10px] text-slate-500 font-mono">16kHz PCM &bull; Whisper</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {liveTranscript.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-center">
                Waiting for audio streams...<br />(Interviewer on Ch 1 auto-triggers reasoning)
              </div>
            ) : (
              liveTranscript.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-xs leading-relaxed ${
                    t.speaker === "Interviewer"
                      ? "bg-indigo-950/30 border-indigo-500/30 text-indigo-200"
                      : "bg-slate-800/40 border-slate-700/50 text-slate-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    {t.speaker}
                  </span>
                  {t.text}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: High-Priority Real-Time Reasoning HUD */}
        <div className="col-span-7 flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden p-3.5 gap-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Real-Time AI Hints & Code Solutions
            </span>
            {isStreaming && (
              <span className="text-[10px] text-amber-400 animate-pulse font-medium">
                Streaming Tokens...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-950/60 rounded-lg p-3 border border-slate-800/60">
            {streamingResponse ? (
              <MarkdownRenderer content={streamingResponse} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-center font-mono text-xs">
                Instant hints, code snippets, and algorithms appear here when the interviewer finishes speaking or on Ctrl+Space.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info Bar */}
      <footer className="px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>Status: {statusMessage}</span>
        </div>
        <div className="font-mono text-slate-500 text-[10px]">
          dHash 320x180 &bull; Semantic Debounce 1.5s &bull; OpenRouter / Groq
        </div>
      </footer>
    </div>
  );
}
