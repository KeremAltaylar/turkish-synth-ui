import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import SynthControls from './SynthControls';
import KeyboardInfo from './KeyboardInfo';
import MaqamNoteDisplay from './MaqamNoteDisplay';
import './MaqamSynth.css';

// --- Global Maqam Data (constants) ---
const ROOT_FREQUENCY = 55; // Root frequency, likely A1 in Hz
const MICROTONAL_SIZE = 53; // Number of steps in the equal temperament system (53-TET)

// The dictionary of Turkish Maqams intervals in 53-TET steps
const tMaqamsIntervals = {
    Rast: [9,8,5,9,9,4,4,5], Nahawand: [9,4,9,9,4,9,9], HicazUzzalHumayun: [5,12,5,9,4,4,5,9], Hicazkar: [5,12,5,9,5,3,5,4,5], Yegah: [9,8,5,9,8,4,4,5], SultaniyegahRuhnevaz: [9,4,9,9,4,9,4,5], FerahnumaAskefza: [4,9,9,9,4,9,9], Sedaraban: [5,12,5,9,5,8,4,5], Huseyniasiran: [8,5,9,8,5,9,9], Suzidil: [5,1,5,4 ,4,5,4,5], Acemasiran: [9,9,4,4,5,9,9,4], Sevkefza: [9,5,4,4,4,5,5,13,4], Iraq: [5,9,8,5,9,9,4,4],EvicSegah: [5,9,8,5,4,5,9,4,4], Ferahnak: [5,9,8,1,4,4,5,9,4, 4], Evicara: [5,13,4,9,5,13,4], Mahur: [9,9,4,9,9,4,5,4], Suzidilara: [9,5,4,4,4 ,5,9,4,5,4], Buzurk: [9,9,4,4,5,9,4,4,5], Suzinak: [5,4,4,4,5,9,4,9,9], ZirguleliSuzinak: [5,12,5,5,4,4,4,5,9], Kurdilihicazkar: [4,1,4,4,4,5,9,4,4,5], Nihavend: [9,4,9,5,4,4,5,8,5], Neveser: [9,5,12,5,5,12,5], Nikriz: [9,5,12,5,9,4 ,4,5], HuseyniMuhayyer:[8,5,9,9,4,4,5,9], GulizarBeyati: [8,5,9,5,4,4,4,5,9], UssakAcem: [8,5,9,9,4,9,9],
    Kurdi: [4,4,1,4,9,4,5,4,9,9], Buselik: [9,4,9,5,4,4,4,5,4,5], Arazbar: [8,5,9,5,3,1,4,4,5,9],  Zirgule: [5,12,5,9,4,1,8,4,5], Sehnaz: [5,12,5,9,4,1,3,5,4,5], SabaSunbule: [8,5,5,13,4,9,9],  Kucek: [8,5,5,13,4,4,5,5,4], EskiSipihr: [8,5,5,1,3,9,4,4,5,4,5],  Dugah:[4,4,5,4,1,13,4,9,9],
    Hisar: [8,5,9,4,5,4,1,8,4,5], YeniSipihr: [5,3,5,4,5,4,5,4,1,3,5,4,5], Nisaburek: [9,8,5,9,5,8,9], Huzzam: [5,9,5,12, 5,9,4,4], Mustear: [9,5,8,9,5,9,4,4], MayeYeniMaye: [5,9,8,1,4,9,9,8], VechiArazbar: [1,4,9,8,5,9,9,3,5], Nisabur: [8,5,9,4,9,9,4,5],  CargahI: [5,13,4,9,5,12,5], CargahII: [9,9,4,9,9,9,4], Araban: [5,8,13,5,5,8,4,5], Urmawi: [9,8,5,9,9,5,8]
};

// Helper function to convert frequency to a musical note name (e.g., A4, C#5)
// Helper function to convert frequency to Turkish Maqam note name
const frequencyToNoteName = (frequency) => {
  const A4 = 440; // A4 frequency
  const A4_MIDI = 69; // MIDI note number for A4

  // Calculate MIDI note number
  const midiNote = 12 * (Math.log2(frequency / A4)) + A4_MIDI;
  
  // Round to the nearest integer for standard notes, or keep decimal for microtonal
  const roundedMidiNote = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidiNote) * 100);

  // Turkish note names according to Nail Yavuzoğlu's theory
  const turkishNoteNames = [
    "Do", // C
    "Do♯", // C#
    "Re", // D
    "Re♯", // D#
    "Mi", // E
    "Fa", // F
    "Fa♯", // F#
    "Sol", // G
    "Sol♯", // G#
    "La", // A
    "La♯", // A#
    "Si"  // B
  ];

  // Special symbols for microtonal intervals
  let noteName = turkishNoteNames[roundedMidiNote % 12];
  const octave = Math.floor(roundedMidiNote / 12) - 1; // MIDI note 0 is C-1
  
  // Add microtonal symbols if needed
  if (Math.abs(cents) > 10 && Math.abs(cents) < 90) {
    if (cents > 0) {
      noteName += "↑"; // Up arrow for slightly sharp
    } else {
      noteName += "↓"; // Down arrow for slightly flat
    }
  }

  return `${noteName}${octave}`;
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
      delayEffect.current.feedback.value = delayFeedback;
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
      activeNotes.current.set(key, frequency);
    }
  }, []);

  const triggerRelease = useCallback((key) => {
    if (synth.current && activeNotes.current.has(key)) {
      const frequency = activeNotes.current.get(key);
      synth.current.triggerRelease(frequency);
      activeNotes.current.delete(key);
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
    <div className="maqam-synth-container">
      <h1>Turkish Maqam Synthesizer</h1>
      <SynthControls
        currentMaqam={currentMaqam}
        setCurrentMaqam={setCurrentMaqam}
        tMaqamsIntervals={tMaqamsIntervals}
        rootNoteOffset={rootNoteOffset}
        setRootNoteOffset={setRootNoteOffset}
        oscillatorType={oscillatorType}
        setOscillatorType={setOscillatorType}
        attack={attack}
        setAttack={setAttack}
        decay={decay}
        setDecay={setDecay}
        sustain={sustain}
        setSustain={setSustain}
        release={release}
        setRelease={setRelease}
        delayAmount={delayAmount}
        setDelayAmount={setDelayAmount}
        delayFeedback={delayFeedback}
        setDelayFeedback={setDelayFeedback}
        reverbAmount={reverbAmount}
        setReverbAmount={setReverbAmount}
      />
      <MaqamNoteDisplay 
        maqamNotes={maqamNotes} 
        frequencyToNoteName={frequencyToNoteName} 
        activeNotes={activeNotes.current}
      />
      <KeyboardInfo />
    </div>
  );
};

export default MaqamSynth;