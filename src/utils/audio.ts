/**
 * Web Audio API synthesizer for notification chimes.
 * Does not require external audio assets and works reliably on mobile devices.
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Browsers may require user gesture
    });
  }
  return audioCtx;
}

export function isAudioContextRunning(): boolean {
  return !!audioCtx && audioCtx.state === 'running';
}

/**
 * Play a high-contrast pleasant 3-tone notification chime for incoming pending payment.
 * Pattern: E5 (659.25Hz) -> A5 (880Hz) -> C#6 (1108.73Hz) - bright Philippine cashier alert
 */
export function playNewOrderChime(volume = 0.6): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 659.25, start: 0, duration: 0.14 },
      { freq: 880.00, start: 0.12, duration: 0.16 },
      { freq: 1108.73, start: 0.26, duration: 0.38 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch (err) {
    console.warn('Audio chime playback blocked or unavailable:', err);
  }
}

/**
 * Play an affirmative, cash-received "ding" for approving print.
 */
export function playApprovedChime(volume = 0.5): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio approval playback failed:', err);
  }
}

/**
 * Play a low double-tone warning for order rejection.
 */
export function playRejectTone(volume = 0.4): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now + offset);
      osc.frequency.exponentialRampToValueAtTime(150, now + offset + 0.09);

      gain.gain.setValueAtTime(volume * 0.4, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  } catch (err) {
    console.warn('Audio reject playback failed:', err);
  }
}
