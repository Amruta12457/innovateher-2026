/**
 * Overlap-based interruption detection using Web Audio API.
 * Uses RMS (root mean square) of waveform to detect speaking + sudden spikes.
 * Gracefully disables if AudioContext is unsupported.
 */

const RMS_THRESHOLD = 0.03; // 0.02–0.05 typical; tune for sensitivity
const SPIKE_MIN_MS = 150;
const DROP_WINDOW_MS = 1500;
const POLL_MS = 80;

export type OverlapDetectorOptions = {
  onInterruption: (confidence: 'low' | 'medium') => void;
  onError?: () => void;
};

export type OverlapDetector = {
  stop: () => void;
};

/**
 * Compute RMS from ByteTimeDomainData (values 0–255, center 128).
 */
function computeRms(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Start overlap detection on the given MediaStream.
 * Returns a stop function. Call it when done.
 * Does not throw; calls onError if AudioContext fails.
 */
export function startOverlapDetection(
  stream: MediaStream,
  options: OverlapDetectorOptions
): OverlapDetector {
  let stopped = false;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let rafId: number | null = null;

  const cleanup = () => {
    stopped = true;
    if (rafId != null) cancelAnimationFrame(rafId);
    source?.disconnect();
    analyser?.disconnect();
    try {
      audioContext?.close();
    } catch {}
  };

  try {
    audioContext = new AudioContext();
  } catch (e) {
    console.warn('[overlap-detection] AudioContext not supported:', e);
    options.onError?.();
    return { stop: () => {} };
  }

  try {
    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
  } catch (e) {
    console.warn('[overlap-detection] Setup failed:', e);
    options.onError?.();
    try {
      audioContext.close();
    } catch {}
    return { stop: () => {} };
  }

  const buffer = new Uint8Array(analyser.fftSize);
  let currentlySpeaking = false;
  let overlapActive = false;
  let overlapStartTime: number | null = null;
  let baseRms = 0;
  let lastEmitAt: number | null = null;
  const SPIKY_THRESHOLD = RMS_THRESHOLD * 1.8;

  const tick = () => {
    if (stopped || !analyser || !audioContext) return;

    analyser.getByteTimeDomainData(buffer);
    const rms = computeRms(buffer);
    const now = Date.now();

    if (rms > RMS_THRESHOLD) {
      if (!currentlySpeaking) {
        currentlySpeaking = true;
        baseRms = rms;
      }
      // Spike: sudden increase above baseline (possible second speaker)
      if (rms > SPIKY_THRESHOLD) {
        if (!overlapActive) {
          overlapActive = true;
          overlapStartTime = now;
        }
      } else {
        overlapActive = false;
        overlapStartTime = null;
      }
    } else {
      // RMS dropped
      if (overlapActive && overlapStartTime != null) {
        const spikeDuration = now - overlapStartTime;
        if (spikeDuration >= SPIKE_MIN_MS && currentlySpeaking) {
          const timeSinceLastEmit = lastEmitAt ? now - lastEmitAt : Infinity;
          if (timeSinceLastEmit > 3000) {
            lastEmitAt = now;
            options.onInterruption(rms < RMS_THRESHOLD * 0.5 ? 'medium' : 'low');
          }
        }
      }
      overlapActive = false;
      overlapStartTime = null;
      if (rms < RMS_THRESHOLD * 0.5) {
        currentlySpeaking = false;
      }
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return { stop: cleanup };
}
