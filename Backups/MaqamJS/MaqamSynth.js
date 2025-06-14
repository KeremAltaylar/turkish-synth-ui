// src/components/MaqamSynth.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

// --- Global Maqam Data (constants) ---
const ROOT_FREQUENCY = 55; // Root frequency, likely A1 in Hz
const MICROTONAL_SIZE = 53; // Number of steps in the equal temperament system (53-TET)

// The dictionary of Turkish Maqams intervals in 53-TET steps
const tMaqamsIntervals = {
    Rast: [9,8,5,9,9,4,4,5], Nahawand: [9,4,9,9,4,9,9], HicazUzzalHumayun: [5,12,5,9,4,4,5,9], Hicazkar: [5,12,5,9,5,3,5,4,5], Yegah: [9,8,5,9,8,4,4,5], SultaniyegahRuhnevaz: [9,4,9,9,4,9,4,5], FerahnumaAskefza: [4,9,9,9,4,9,9], Sedaraban: [5,12,5,9,5,8,4,5], Huseyniasiran: [8,5,9,8,5,9,9], Suzidil: [5,1,5,4 ,4,5,4,5], Acemasiran: [9,9,4,4,5,9,9,4], Sevkefza: [9,5,4,4,4,5,5,13,4], Iraq: [5,9,8,5,9,9,4,4],EvicSegah: [5,9,8,5,4,5,9,4,4], Ferahnak: [5,9,8,1,4,4,5,9,4, 4], Evicara: [5,13,4,9,5,13,4], Mahur: [9,9,4,9,9,4,5,4], Suzidilara: [9,5,4,4,4 ,5,9,4,5,4], Buzurk: [9,9,4,4,5,9,4,4,5], Suzinak: [5,4,4,4,5,9,4,9,9], ZirguleliSuzinak: [5,12,5,5,4,4,4,5,9], Kurdilihicazkar: [4,1,4,4,4,5,9,4,4,5], Nihavend: [9,4,9,5,4,4,5,8,5], Neveser: [9,5,12,5,5,12,5], Nikriz: [9,5,12,5,9,4 ,4,5], HuseyniMuhayyer:[8,5,9,9,4,4,5,9], GulizarBeyati: [8,5,9,5,4,4,4,5,9], UssakAcem: [8,5,9,9,4,9,9],
    Kurdi: [4,4,1,4,9,4,5,4,9,9], Buselik: [9,4,9,5,4,4,4,5,4,5], Arazbar: [8,5,9,5,3,1,4,4,5,9],  Zirgule: [5,12,5,9,4,1,8,4,5], Sehnaz: [5,12,5,9,4,1,3,5,4,5], SabaSunbule: [8,5,5,13,4,9,9],  Kucek: [8,5,5,13,4,4,5,5,4], EskiSipihr: [8,5,5,1,3,9,4,4,5,4,5],  Dugah:[4,4,5,4,1,13,4,9,9],
    Hisar: [8,5,9,4,5,4,1,8,4,5], YeniSipihr: [5,3,5,4,5,4,5,4,1,3,5,4,5], Nisaburek: [9,8,5,9,5,8,9], Huzzam: [5,9,5,12, 5,9,4,4], Mustear: [9,5,8,9,5,9,4,4], MayeYeniMaye: [5,9,8,1,4,9,9,8], VechiArazbar: [1,4,9,8,5,9,9,3,5], Nisabur: [8,5,9,4,9,9,4,5],  CargahI: [5,13,4,9,5,12,5], CargahII: [9,9,4,9,9,9,4], Araban: [5,8,13,5,5,8,4,5], Urmawi: [9,8,5,9,9,5,8]
};

const MaqamSynth = () => {
  const synth = useRef(null);
  const gainNode = useRef(null);
  const delayEffect = useRef(null);
  const reverbEffect = useRef(null);
  const limiter = useRef(null); // Add a limiter to prevent clipping

  // --- State for Synth Parameters ---
  const [oscillatorType, setOscillatorType] = useState('sine');
  const [attack, setAttack] = useState(0.01); // Default attack
  const [decay, setDecay] = useState(0.2);   // Default decay
  const [sustain, setSustain] = useState(0.5); // Default sustain
  const [release, setRelease] = useState(1.0);  // Default release

  // --- State for Effects ---
  const [delayAmount, setDelayAmount] = useState(0);
  const [delayFeedback, setDelayFeedback] = useState(0.5); // New: Delay Feedback
  const [reverbAmount, setReverbAmount] = useState(0);

  // --- Maqam related states ---
  const [currentMaqam, setCurrentMaqam] = useState('Rast');
  const [maqamNotes, setMaqamNotes] = useState([]);
  const [rootNoteOffset, setRootNoteOffset] = useState(0);

  // Keep track of currently pressed keys to handle sustained notes
  const activeNotes = useRef(new Map()); // Map: key -> frequency

  // --- Maqam Calculation Logic ---
  const calculateMaqamFrequencies = useCallback((maqamName, rootFrequency = ROOT_FREQUENCY) => {
    const ratio = tMaqamsIntervals[maqamName];

    if (!ratio) {
      console.warn(`Maqam "${maqamName}" not found in intervals dictionary.`);
      return [];
    }

    const maqamFrequencies = [rootFrequency];
    let currentFreq = rootFrequency;

    for (let i = 0; i < ratio.length; i++) {
      currentFreq *= Math.pow(2, (ratio[i] / MICROTONAL_SIZE));
      maqamFrequencies.push(currentFreq);
    }

    const fullMaqamScale = [];
    const minOctave = -1; // Go one octave down from root
    const maxOctave = 2; // Go two octaves up from root

    for (let oct = minOctave; oct <= maxOctave; oct++) {
      maqamFrequencies.forEach(freq => {
        fullMaqamScale.push(freq * Math.pow(2, oct));
      });
    }

    fullMaqamScale.sort((a, b) => a - b);
    return fullMaqamScale;

  }, []);

  // --- Initialize Synth and Effects ---
  useEffect(() => {
    if (!synth.current) {
      // Create master gain node
      gainNode.current = new Tone.Gain(0.5);

      // Create effects
      delayEffect.current = new Tone.FeedbackDelay("8n", delayFeedback).set({ wet: 0 });
      reverbEffect.current = new Tone.Reverb({ decay: 1.5, wet: 0.05 }).set({ wet: 0 });
      limiter.current = new Tone.Limiter(-6); // -6 dB threshold, prevents clipping

      // Chain: Synth -> Delay -> Reverb -> Limiter -> Gain -> Destination
      synth.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: oscillatorType },
        envelope: { attack, decay, sustain, release }, // Use state variables
      }).chain(delayEffect.current, reverbEffect.current, limiter.current, gainNode.current, Tone.Destination);

      // Start Tone.js context on first user interaction
      const startAudio = () => {
        if (Tone.context.state !== 'running') {
          Tone.start();
          console.log('Audio context started.');
        }
        document.removeEventListener('keydown', startAudio);
        document.removeEventListener('click', startAudio);
      };
      document.addEventListener('keydown', startAudio);
      document.addEventListener('click', startAudio);
    }
  }, []); // Empty dependency array: runs only once on mount

  // --- Update Maqam Notes ---
  useEffect(() => {
    const newRootFrequency = ROOT_FREQUENCY * Math.pow(2, rootNoteOffset);
    const newNotes = calculateMaqamFrequencies(currentMaqam, newRootFrequency);
    setMaqamNotes(newNotes);
    console.log(`Maqam: ${currentMaqam}, Root Freq: ${newRootFrequency}, Notes:`, newNotes.map(n => n.toFixed(2)));
  }, [currentMaqam, rootNoteOffset, calculateMaqamFrequencies]);

  // --- Update Synth Parameters (ADSR, Oscillator Type) ---
  useEffect(() => {
    if (synth.current) {
      synth.current.set({
        oscillator: { type: oscillatorType },
        envelope: { attack, decay, sustain, release },
      });
    }
  }, [oscillatorType, attack, decay, sustain, release]);

  // --- Update Delay Effect ---
  useEffect(() => {
    if (delayEffect.current) {
      delayEffect.current.wet.value = delayAmount;
      delayEffect.current.feedback.value = delayFeedback; // Update feedback
    }
  }, [delayAmount, delayFeedback]);

  // --- Update Reverb Effect ---
  useEffect(() => {
    if (reverbEffect.current) {
      reverbEffect.current.wet.value = reverbAmount;
    }
  }, [reverbAmount]);

  // --- Play/Release Notes ---
  const triggerAttack = useCallback((frequency, key) => {
    if (synth.current && !activeNotes.current.has(key)) { // Only attack if not already playing
      synth.current.triggerAttack(frequency);
      activeNotes.current.set(key, frequency); // Store key and frequency
    }
  }, []);

  const triggerRelease = useCallback((key) => {
    if (synth.current && activeNotes.current.has(key)) {
      const frequency = activeNotes.current.get(key);
      synth.current.triggerRelease(frequency);
      activeNotes.current.delete(key); // Remove from active notes
    }
  }, []);

  // --- Keyboard Event Listeners ---
  useEffect(() => {
    const baseOctaveKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş'];
    const octaveDownKeys = ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç'];
    const octaveUpKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı', 'o'];

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Only process keys if they are part of our synth mapping
      if (![...baseOctaveKeys, ...octaveDownKeys, ...octaveUpKeys].includes(key)) {
        return;
      }
      e.preventDefault(); // Prevent default browser actions for synth keys

      const currentMaqamScaleLength = tMaqamsIntervals[currentMaqam]?.length + 1;

      let baseKeyIndex = -1;
      let octaveSlot = -1; // -1 for octave down keys, 0 for base keys, 1 for octave up keys (relative to fullMaqamScale generation)

      if (baseOctaveKeys.includes(key)) {
        baseKeyIndex = baseOctaveKeys.indexOf(key);
        octaveSlot = 1; // Corresponds to the *second* octave generated in fullMaqamScale (index 1)
      } else if (octaveDownKeys.includes(key)) {
        baseKeyIndex = octaveDownKeys.indexOf(key);
        octaveSlot = 0; // Corresponds to the *first* octave generated in fullMaqamScale (index 0)
      } else if (octaveUpKeys.includes(key)) {
        baseKeyIndex = octaveUpKeys.indexOf(key);
        octaveSlot = 2; // Corresponds to the *third* octave generated in fullMaqamScale (index 2)
      }

      if (baseKeyIndex !== -1 && maqamNotes.length > 0) {
        const absoluteNoteIndex = (octaveSlot * currentMaqamScaleLength) + baseKeyIndex;

        if (absoluteNoteIndex >= 0 && absoluteNoteIndex < maqamNotes.length) {
          triggerAttack(maqamNotes[absoluteNoteIndex], key);
        } else {
          console.warn(`Key "${key}" maps to an out-of-bounds note index: ${absoluteNoteIndex}. Maqam notes length: ${maqamNotes.length}. Current Maqam Scale Length: ${currentMaqamScaleLength}`);
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      // Only process keys if they are part of our synth mapping
      if (![...baseOctaveKeys, ...octaveDownKeys, ...octaveUpKeys].includes(key)) {
        return;
      }
      e.preventDefault(); // Prevent default browser actions
      triggerRelease(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Clear any remaining active notes when component unmounts
      activeNotes.current.clear();
    };
  }, [maqamNotes, currentMaqam, triggerAttack, triggerRelease]); // Added triggerAttack/Release to dependencies

  return (
    <div>
      <div className="controls">
        {/* Maqam Selection */}
        <label htmlFor="maqam-select">Select Maqam:</label>
        <select
          id="maqam-select"
          value={currentMaqam}
          onChange={(e) => setCurrentMaqam(e.target.value)}
        >
          {Object.keys(tMaqamsIntervals).map((maqam) => (
            <option key={maqam} value={maqam}>{maqam}</option>
          ))}
        </select>

        {/* Root Note Offset (Octave Shift for the whole Maqam) */}
        <div>
          <label htmlFor="root-offset-slider">Root Octave Offset:</label>
          <input
            id="root-offset-slider"
            type="range"
            min="-2"
            max="2"
            step="1"
            value={rootNoteOffset}
            onChange={(e) => setRootNoteOffset(parseInt(e.target.value))}
          />
          <span>{rootNoteOffset}</span>
        </div>

        {/* Oscillator Type Selection */}
        <div>
          <label>Oscillator Type:</label>
          <input type="radio" id="sine" name="oscType" value="sine" checked={oscillatorType === 'sine'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="sine">Sine</label>
          <input type="radio" id="sawtooth" name="oscType" value="sawtooth" checked={oscillatorType === 'sawtooth'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="sawtooth">Sawtooth</label>
          <input type="radio" id="triangle" name="oscType" value="triangle" checked={oscillatorType === 'triangle'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="triangle">Triangle</label>
          <input type="radio" id="square" name="oscType" value="square" checked={oscillatorType === 'square'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="square">Square</label>
        </div>

        {/* ADSR Controls */}
        <div className="adsr-controls">
          <h3>Envelope (ADSR)</h3>
          <div>
            <label htmlFor="attack-slider">Attack:</label>
            <input type="range" id="attack-slider" min="0.001" max="2" step="0.001" value={attack} onChange={(e) => setAttack(parseFloat(e.target.value))} />
            <span>{attack.toFixed(3)}s</span>
          </div>
          <div>
            <label htmlFor="decay-slider">Decay:</label>
            <input type="range" id="decay-slider" min="0.01" max="2" step="0.01" value={decay} onChange={(e) => setDecay(parseFloat(e.target.value))} />
            <span>{decay.toFixed(2)}s</span>
          </div>
          <div>
            <label htmlFor="sustain-slider">Sustain:</label>
            <input type="range" id="sustain-slider" min="0" max="1" step="0.01" value={sustain} onChange={(e) => setSustain(parseFloat(e.target.value))} />
            <span>{sustain.toFixed(2)}</span>
          </div>
          <div>
            <label htmlFor="release-slider">Release:</label>
            <input type="range" id="release-slider" min="0.01" max="3" step="0.01" value={release} onChange={(e) => setRelease(parseFloat(e.target.value))} />
            <span>{release.toFixed(2)}s</span>
          </div>
        </div>

        {/* Delay Control */}
        <div>
          <label htmlFor="delay-slider">Delay (Wet Mix):</label>
          <input
            id="delay-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={delayAmount}
            onChange={(e) => setDelayAmount(parseFloat(e.target.value))}
          />
          <span>{delayAmount.toFixed(2)}</span>
        </div>
        <div>
          <label htmlFor="delay-feedback-slider">Delay Feedback:</label>
          <input
            id="delay-feedback-slider"
            type="range"
            min="0"
            max="0.95" // Keep below 1 to prevent runaway feedback
            step="0.01"
            value={delayFeedback}
            onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
          />
          <span>{delayFeedback.toFixed(2)}</span>
        </div>

        {/* Reverb Control */}
        <div>
          <label htmlFor="reverb-slider">Reverb (Wet Mix):</label>
          <input
            id="reverb-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={reverbAmount}
            onChange={(e) => setReverbAmount(parseFloat(e.target.value))}
          />
          <span>{reverbAmount.toFixed(2)}</span>
        </div>

      </div>
      <div className="keyboard-info">
        <p>Base Octave: <kbd>a</kbd><kbd>s</kbd><kbd>d</kbd><kbd>f</kbd><kbd>g</kbd><kbd>h</kbd><kbd>j</kbd><kbd>k</kbd><kbd>l</kbd><kbd>ş</kbd></p>
        <p>Octave Down: <kbd>z</kbd><kbd>x</kbd><kbd>c</kbd><kbd>v</kbd><kbd>b</kbd><kbd>n</kbd><kbd>m</kbd><kbd>ö</kbd><kbd>ç</kbd></p>
        <p>Octave Up: <kbd>q</kbd><kbd>w</kbd><kbd>e</kbd><kbd>r</kbd><kbd>t</kbd><kbd>y</kbd><kbd>u</kbd><kbd>ı</kbd><kbd>o</kbd></p>
      </div>
    </div>
  );
};

export default MaqamSynth;