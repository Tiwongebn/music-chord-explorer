// ============================================================
// Backing band sounds: a synth upright bass, a ride cymbal and
// a hi-hat, all built in Tone (nothing to download). Comping
// chords use the app's piano and guitar via scheduleVoicing.
//
// Everything goes through one bus so Stop can cut notes that
// were already scheduled a moment ahead, and through Tone's
// destination so the header's mute applies.
// ============================================================

import * as Tone from "tone";

interface Kit {
  bus: Tone.Gain;
  bass: Tone.MonoSynth;
  ride: Tone.MetalSynth;
  hat: Tone.NoiseSynth;
  stick: Tone.MembraneSynth;
}

let kit: Kit | null = null;

function getKit(): Kit {
  if (kit) {
    return kit;
  }

  const bus = new Tone.Gain(1).toDestination();

  // Round, woody pluck: a triangle through a low-pass filter
  // that closes quickly after each note.
  const bass = new Tone.MonoSynth({
    oscillator: { type: "triangle" },
    filter: { type: "lowpass", rolloff: -24, Q: 1.2 },
    envelope: { attack: 0.006, decay: 0.4, sustain: 0.35, release: 0.12 },
    filterEnvelope: {
      attack: 0.002,
      decay: 0.22,
      sustain: 0.25,
      release: 0.2,
      baseFrequency: 110,
      octaves: 3.4,
    },
  }).connect(bus);
  bass.volume.value = -9;

  // Ride: a bright metallic ping with a long, quiet wash.
  const rideFilter = new Tone.Filter(5200, "highpass").connect(bus);
  const ride = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.1, release: 0.4 },
    harmonicity: 5.1,
    modulationIndex: 24,
    resonance: 6000,
    octaves: 1.2,
  }).connect(rideFilter);
  ride.frequency.value = 340;
  ride.volume.value = -21;

  // Hi-hat foot "chick" on 2 and 4.
  const hatFilter = new Tone.Filter(7000, "highpass").connect(bus);
  const hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
  }).connect(hatFilter);
  hat.volume.value = -20;

  // Count-in: a dry stick click.
  const stick = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
  }).connect(bus);
  stick.volume.value = -10;

  kit = { bus, bass, ride, hat, stick };

  return kit;
}

// Build the instruments ahead of the first note.
export function preloadBand(): void {
  getKit();
}

// Open the bus from `time` (after a Stop closed it).
export function openBand(time: number): void {
  const { bus } = getKit();

  bus.gain.cancelScheduledValues(time);
  bus.gain.setValueAtTime(1, time);
}

// Fade out fast, cutting anything already scheduled.
export function closeBand(): void {
  if (!kit) {
    return;
  }

  const now = Tone.now();

  kit.bus.gain.cancelScheduledValues(now);
  kit.bus.gain.setTargetAtTime(0, now, 0.015);
  kit.bass.triggerRelease(now);
}

export function playBass(
  midi: number,
  time: number,
  duration: number,
  velocity: number
): void {
  getKit().bass.triggerAttackRelease(
    Tone.Frequency(midi, "midi").toFrequency(),
    duration,
    time,
    velocity
  );
}

export function playRide(time: number, velocity: number): void {
  getKit().ride.triggerAttackRelease(340, 0.3, time, velocity);
}

export function playHat(time: number, velocity: number): void {
  getKit().hat.triggerAttackRelease(0.05, time, velocity);
}

export function playStick(time: number, accent: boolean): void {
  getKit().stick.triggerAttackRelease(
    accent ? "G5" : "D5",
    0.05,
    time,
    accent ? 0.9 : 0.6
  );
}
