/**
 * AudioWorkletProcessor for Real-Time Dual-Channel Audio Streaming.
 * Ingests audio, applies Energy-based VAD (Voice Activity Detection),
 * accumulates complete speech utterances (~1.5s - 2.5s chunks),
 * and transmits 16-bit PCM chunks to the backend.
 */
class PCM16DownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.channelId = options.processorOptions?.channelId || 0; // 0: User, 1: Speaker
    
    // Transmit when accumulated speech reaches ~2 seconds (~32,000 samples @ 16kHz)
    // or when a pause follows speech
    this.sampleRateRatio = sampleRate / 16000;
    this.accumulatedSamples = [];
    this.silenceCounter = 0;
    this.speechDetected = false;
    this.energyThreshold = 0.015; // VAD threshold
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    if (!channelData) return true;

    // 1. Calculate Frame RMS Energy for Voice Activity Detection
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / channelData.length);

    const isVoiced = rms > this.energyThreshold;

    if (isVoiced) {
      this.speechDetected = true;
      this.silenceCounter = 0;
    } else if (this.speechDetected) {
      this.silenceCounter++;
    }

    // 2. Downsample and store if active or speech in progress
    if (this.speechDetected) {
      for (let i = 0; i < channelData.length; i += this.sampleRateRatio) {
        const sample = Math.max(-1, Math.min(1, channelData[Math.floor(i)]));
        const int16 = sample < 0 ? sample * 32768 : sample * 32767;
        this.accumulatedSamples.push(int16);
      }
    }

    // 3. Dispatch trigger:
    // Case A: Natural pause after speech (~0.6s silence = ~25 frames at 128 samples/frame)
    // Case B: Reached max phrase buffer (~3 seconds = 48000 samples)
    const silenceFrameThreshold = Math.round((sampleRate / 128) * 0.6); // ~600ms silence
    const shouldDispatch = 
      (this.speechDetected && this.silenceCounter > silenceFrameThreshold && this.accumulatedSamples.length > 8000) ||
      (this.accumulatedSamples.length >= 48000);

    if (shouldDispatch) {
      this.dispatchBuffer();
    }

    return true;
  }

  dispatchBuffer() {
    if (this.accumulatedSamples.length < 8000) {
      // Ignore clicks / noise shorter than 500ms
      this.accumulatedSamples = [];
      this.speechDetected = false;
      this.silenceCounter = 0;
      return;
    }

    const sampleCount = this.accumulatedSamples.length;
    const rawBytes = new Uint8Array(1 + sampleCount * 2);
    rawBytes[0] = this.channelId; // Byte 0 = channel tag

    const view = new DataView(rawBytes.buffer);
    for (let i = 0; i < sampleCount; i++) {
      view.setInt16(1 + i * 2, this.accumulatedSamples[i], true); // Little-endian
    }

    this.port.postMessage(rawBytes.buffer, [rawBytes.buffer]);

    // Reset buffer
    this.accumulatedSamples = [];
    this.speechDetected = false;
    this.silenceCounter = 0;
  }
}

registerProcessor("pcm-downsampler-processor", PCM16DownsamplerProcessor);
