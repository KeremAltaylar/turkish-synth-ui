// src/components/MaqamSynth.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

// --- Global Maqam Data (constants) ---
const ROOT_FREQUENCY = 55; // Root frequency, roughly A1 in Hz
const MICROTONAL_SIZE = 53; // Number of steps in the equal temperament system (53-TET)

// The dictionary of Turkish Maqams intervals in 53-TET steps
const tMaqamsIntervals = {
    Rast: [9,8,5,9,9,4,4,5], Nahawand: [9,4,9,9,4,9,9], HicazUzzalHumayun: [5,12,5,9,4,4,5,9], Hicazkar: [5,12,5,9,5,3,5,4,5], Yegah: [9,8,5,9,8,4,4,5], SultaniyegahRuhnevaz: [9,4,9,9,4,9,4,5], FerahnumaAskefza: [4,9,9,9,4,9,9], Sedaraban: [5,12,5,9,5,8,4,5], Huseyniasiran: [8,5,9,8,5,9,9], Suzidil: [5,1,5,4 ,4,5,4,5], Acemasiran: [9,9,4,4,5,9,9,4], Sevkefza: [9,5,4,4,4,5,5,13,4], Iraq: [5,9,8,5,9,9,4,4],EvicSegah: [5,9,8,5,4,5,9,4,4], Ferahnak: [5,9,8,1,4,4,5,9,4, 4], Evicara: [5,13,4,9,5,13,4], Mahur: [9,9,4,9,9,4,5,4], Suzidilara: [9,5,4,4,4 ,5,9,4,5,4], Buzurk: [9,9,4,4,5,9,4,4,5], Suzinak: [5,4,4,4,5,9,4,9,9], ZirguleliSuzinak: [5,12,5,5,4,4,4,5,9], Kurdilihicazkar: [4,1,4,4,4,5,9,4,4,5], Nihavend: [9,4,9,5,4,4,5,8,5], Neveser: [9,5,12,5,5,12,5], Nikriz: [9,5,12,5,9,4 ,4,5], HuseyniMuhayyer:[8,5,9,9,4,4,5,9], GulizarBeyati: [8,5,9,5,4,4,4,5,9], UssakAcem: [8,5,9,9,4,9,9],
    Kurdi: [4,4,1,4,9,4,5,4,9,9], Buselik: [9,4,9,5,4,4,4,5,4,5], Arazbar: [8,5,9,5,3,1,4,4,5,9],  Zirgule: [5,12,5,9,4,1,8,4,5], Sehnaz: [5,12,5,9,4,1,3,5,4,5], SabaSunbule: [8,5,5,13,4,9,9],  Kucek: [8,5,5,13,4,4,5,5,4], EskiSipihr: [8,5,5,1,3,9,4,4,5,4,5],  Dugah:[4,4,5,4,1,13,4,9,9],
    Hisar: [8,5,9,4,5,4,1,8,4,5], YeniSipihr: [5,3,5,4,5,4,5,4,1,3,5,4,5], Nisaburek: [9,8,5,9,5,8,9], Huzzam: [5,9,5,12, 5,9,4,4], Mustear: [9,5,8,9,5,9,4,4], MayeYeniMaye: [5,9,8,1,4,9,9,8], VechiArazbar: [1,4,9,8,5,9,9,3,5], Nisabur: [8,5,9,4,9,9,4,5],  CargahI: [5,13,4,9,5,12,5], CargahII: [9,9,4,9,9,9,4], Araban: [5,8,13,5,5,8,4,5], Urmawi: [9,8,5,9,9,5,8]
};

// Turkish 53-TET Note Names starting from Kaba Çargah (0)
// This array defines the names for each step in the 53-TET system relative to a base note.
// The actual starting point (Kaba Çargah) needs to be mapped to an absolute step,
// which in this case we'll consider step 0 for the naming system.
const turkish53TETNoteNames = [
    "Kaba Çargah", "Kaba Dik Kurdi", "Kaba Kurdi", "Kaba Zirgüle", "Kaba Buselik",
    "Kaba Dik Acem", "Kaba Nim Hicaz", "Kaba Hicaz", "Kaba Dik Segah", "Kaba Segah",
    "Kaba Müstear", "Kaba Evc", "Kaba Mahur", "Kaba Duraq", "Kaba Rast",
    "Yegah", "Dik Kurdi", "Kurdi", "Zirgüle", "Buselik",
    "Dik Acem", "Nim Hicaz", "Hicaz", "Dik Segah", "Segah",
    "Müstear", "Evc", "Mahur", "Duraq", "Rast", // <- This 'Rast' is often used as the reference point (starting degree 0)
    "Neva", "Dik Neva", "Hüseyni", "Dik Hüseyni", "Acem",
    "Dik Acem Aşiran", "Nim Şehnaz", "Şehnaz", "Dik Saban", "Saban",
    "Dik Hisar", "Hisar", "Dik Evc", "Evc", "Dik Mahur",
    "Mahur", "Dik Duraq", "Rast", "Dik Rast", "Zirgüleli Rast",
    "Nişaburek", "Buselik Aşiran", "Sünbüle"
];

// Reference point for the turkish53TETNoteNames array (Rast is often considered the 0 point)
// We need to know which index in `turkish53TETNoteNames` corresponds to the base `Rast` (or the starting point of your scale).
// Let's assume the 'Rast' at index 29 is our base note (like C in Western music).
const RAST_INDEX_IN_53TET_NAMES = 29; // Index of 'Rast' in the turkish53TETNoteNames array

const MaqamSynth = () => {
  const synth = useRef(null);
  const gainNode = useRef(null);
  const delayEffect = useRef(null);
  const reverbEffect = useRef(null);
  const limiter = useRef(null);

  // --- State for Synth Parameters ---
  const [oscillatorType, setOscillatorType] = useState('sine');
  const [attack, setAttack] = useState(0.01);
  const [decay, setDecay] = useState(0.2);
  const [sustain, setSustain] = useState(0.5);
  const [release, setRelease] = useState(1.0);

  // --- State for Effects ---
  const [delayAmount, setDelayAmount] = useState(0);
  const [delayFeedback, setDelayFeedback] = useState(0.5);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [reverbDecay, setReverbDecay] = useState(1.5);

  // --- Master Volume ---
  const [masterVolume, setMasterVolume] = useState(0.5);

  // --- Maqam related states ---
  const [currentMaqam, setCurrentMaqam] = useState('Rast');
  const [maqamNotes, setMaqamNotes] = useState([]); // Stores actual frequencies
  const [maqamIntervalsIn53TET, setMaqamIntervalsIn53TET] = useState([]); // Stores the 53-TET steps for current maqam
  const [rootNoteOffset, setRootNoteOffset] = useState(0);

  // Keep track of currently pressed keys and notes for visual feedback
  const activeKeys = useRef(new Set()); // Store keyboard key strings (e.g., 'a', 's')
  const activeNotes = useRef(new Map()); // Store Tone.js active notes (key -> frequency)

  // --- Maqam Calculation Logic ---
  const calculateMaqamFrequencies = useCallback((maqamName, rootFrequency = ROOT_FREQUENCY) => {
    const ratio = tMaqamsIntervals[maqamName];

    if (!ratio) {
      console.warn(`Maqam "${maqamName}" not found in intervals dictionary.`);
      return { frequencies: [], steps: [] };
    }

    const currentMaqamSteps = [0]; // The first note is 0 steps from itself
    const maqamFrequencies = [rootFrequency];
    let currentFreq = rootFrequency;
    let currentStepSum = 0;

    for (let i = 0; i < ratio.length; i++) {
      currentStepSum += ratio[i];
      currentMaqamSteps.push(currentStepSum); // Store the cumulative step
      currentFreq *= Math.pow(2, (ratio[i] / MICROTONAL_SIZE));
      maqamFrequencies.push(currentFreq);
    }

    const fullMaqamScaleFrequencies = [];
    const fullMaqamScaleSteps = [];

    // Assuming the main octave of the scale starts from the 'Rast' in the turkish53TETNoteNames array
    // The "base" octave for the keyboard keys is the one starting from the 'Rast' at index 29 (in 53-TET)
    // We want to generate frequencies and map them to appropriate names.

    // Calculate a 'base' step for the very first note (Kaba Çargah at 0)
    // This is how many 53-TET steps away from the overall 'Rast' our actual ROOT_FREQUENCY (A1) is.
    // If ROOT_FREQUENCY (55Hz) is A1, and 'Rast' is 29 steps above Kaba Çargah,
    // we need to determine the absolute 53-TET index for ROOT_FREQUENCY.
    // For simplicity, let's assume ROOT_FREQUENCY is equivalent to the 'Rast' note (index 29) when rootNoteOffset is 0.
    const root53TETStep = RAST_INDEX_IN_53TET_NAMES + (rootNoteOffset * MICROTONAL_SIZE);


    for (let oct = -1; oct <= 2; oct++) { // Corresponding to octaveDown, baseOctave, octaveUp slots
      maqamFrequencies.forEach((freq, indexInMaqam) => {
        // Calculate the absolute 53-TET step for this note
        // Example: If currentMaqamSteps are [0, 9, 17, ...] for Rast
        // For the first octave (oct = -1), the steps would be adjusted by -1 * MICROTONAL_SIZE
        const absolute53TETStep = root53TETStep + (oct * MICROTONAL_SIZE) + currentMaqamSteps[indexInMaqam];

        // Ensure the step index wraps correctly within the 0-52 range for naming
        const normalizedStepIndex = (absolute53TETStep % MICROTONAL_SIZE + MICROTONAL_SIZE) % MICROTONAL_SIZE;

        fullMaqamScaleFrequencies.push(freq * Math.pow(2, oct));
        fullMaqamScaleSteps.push(normalizedStepIndex); // Store the normalized step for naming
      });
    }

    // Sort combined arrays by frequency to match keyboard order
    const combined = fullMaqamScaleFrequencies.map((freq, i) => ({ freq, step: fullMaqamScaleSteps[i] }));
    combined.sort((a, b) => a.freq - b.freq);

    return {
      frequencies: combined.map(item => item.freq),
      steps: combined.map(item => item.step)
    };

  }, [rootNoteOffset]); // Added rootNoteOffset to dependencies

  // --- Initialize Synth and Effects ---
  useEffect(() => {
    if (!synth.current) {
      gainNode.current = new Tone.Gain(masterVolume).toDestination();
      delayEffect.current = new Tone.FeedbackDelay("8n", delayFeedback).set({ wet: 0 });
      reverbEffect.current = new Tone.Reverb({ decay: reverbDecay, wet: 0.05 }).set({ wet: 0 });
      limiter.current = new Tone.Limiter(-6);

      synth.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: oscillatorType },
        envelope: { attack, decay, sustain, release },
      }).chain(delayEffect.current, reverbEffect.current, limiter.current, gainNode.current);

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

  // --- Update Maqam Notes and Steps ---
  useEffect(() => {
    const { frequencies, steps } = calculateMaqamFrequencies(currentMaqam);
    setMaqamNotes(frequencies);
    setMaqamIntervalsIn53TET(steps); // Store the calculated 53-TET steps
    console.log(`Maqam: ${currentMaqam}, Notes:`, frequencies.map(n => n.toFixed(2)), `Steps:`, steps);
  }, [currentMaqam, rootNoteOffset, calculateMaqamFrequencies]); // Rerun if maqam or root changes

  // --- Update Synth Parameters (ADSR, Oscillator Type) ---
  useEffect(() => {
    if (synth.current) {
      synth.current.set({
        oscillator: { type: oscillatorType },
        envelope: { attack, decay, sustain, release },
      });
    }
  }, [oscillatorType, attack, decay, sustain, release]);

  // --- Update Effect Parameters ---
  useEffect(() => {
    if (delayEffect.current) {
      delayEffect.current.wet.value = delayAmount;
      delayEffect.current.feedback.value = delayFeedback;
    }
  }, [delayAmount, delayFeedback]);

  useEffect(() => {
    if (reverbEffect.current) {
      reverbEffect.current.wet.value = reverbAmount;
      reverbEffect.current.decay = reverbDecay;
    }
  }, [reverbAmount, reverbDecay]);

  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = masterVolume;
    }
  }, [masterVolume]);

  // --- Play/Release Notes ---
  const triggerAttack = useCallback((frequency, key) => {
    if (synth.current && !activeNotes.current.has(key)) {
      synth.current.triggerAttack(frequency);
      activeNotes.current.set(key, frequency);
      activeKeys.current.add(key); // Add key to active set for visual feedback
      // Force a re-render to update the visual keyboard
      setMaqamIntervalsIn53TET(prev => [...prev]); // Trigger update
    }
  }, []);

  const triggerRelease = useCallback((key) => {
    if (synth.current && activeNotes.current.has(key)) {
      const frequency = activeNotes.current.get(key);
      synth.current.triggerRelease(frequency);
      activeNotes.current.delete(key);
      activeKeys.current.delete(key); // Remove key from active set
      setMaqamIntervalsIn53TET(prev => [...prev]); // Trigger update
    }
  }, []);

  // Define keyboard mappings
  const keyboardLayout = {
    baseOctave: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş'],
    octaveDown: ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç'],
    octaveUp: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı', 'o']
  };

  // --- Keyboard Event Listeners ---
  useEffect(() => {
    const allSynthKeys = [
      ...keyboardLayout.baseOctave,
      ...keyboardLayout.octaveDown,
      ...keyboardLayout.octaveUp
    ];

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (!allSynthKeys.includes(key) || e.repeat) {
        return;
      }
      e.preventDefault();

      const currentMaqamScaleLength = tMaqamsIntervals[currentMaqam]?.length + 1;

      let baseKeyIndex = -1;
      let octaveSlot = -1;

      if (keyboardLayout.baseOctave.includes(key)) {
        baseKeyIndex = keyboardLayout.baseOctave.indexOf(key);
        octaveSlot = 1;
      } else if (keyboardLayout.octaveDown.includes(key)) {
        baseKeyIndex = keyboardLayout.octaveDown.indexOf(key);
        octaveSlot = 0;
      } else if (keyboardLayout.octaveUp.includes(key)) {
        baseKeyIndex = keyboardLayout.octaveUp.indexOf(key);
        octaveSlot = 2;
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
      if (!allSynthKeys.includes(key)) {
        return;
      }
      e.preventDefault();
      triggerRelease(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      activeNotes.current.clear();
      activeKeys.current.clear(); // Clear active visual keys too
    };
  }, [maqamNotes, currentMaqam, triggerAttack, triggerRelease]);

  // Helper to render a row of visual keys
  const renderKeyRow = (keys, octaveLabel, octaveMultiplier) => (
    <div className="keyboard-row">
      <h4>{octaveLabel}</h4>
      {keys.map((key, index) => {
        const currentMaqamScaleLength = tMaqamsIntervals[currentMaqam]?.length + 1;
        const absoluteNoteIndex = (octaveMultiplier * currentMaqamScaleLength) + index;

        // Get the 53-TET step for this note from the stored array
        const note53TETStep = maqamIntervalsIn53TET[absoluteNoteIndex];
        // Look up the Turkish name using the normalized step
        const noteDisplay = (note53TETStep !== undefined && turkish53TETNoteNames[note53TETStep])
                            ? turkish53TETNoteNames[note53TETStep]
                            : 'N/A';

        return (
          <button
            key={key}
            className={`key ${activeKeys.current.has(key) ? 'active' : ''}`}
            onMouseDown={() => {
              if (maqamNotes[absoluteNoteIndex]) {
                triggerAttack(maqamNotes[absoluteNoteIndex], key);
              }
            }}
            onMouseUp={() => triggerRelease(key)}
            onMouseLeave={() => triggerRelease(key)}
            onTouchStart={(e) => {
              e.preventDefault();
              if (maqamNotes[absoluteNoteIndex]) {
                triggerAttack(maqamNotes[absoluteNoteIndex], key);
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              triggerRelease(key);
            }}
          >
            <span className="key-label">{key}</span>
            <span className="note-label">{noteDisplay}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="maqam-synth-container">
      <div className="controls-panel">
        {/* Maqam Selection */}
        <div className="control-group">
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
        </div>

        {/* Root Note Offset (Octave Shift for the whole Maqam) */}
        <div className="control-group">
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

        {/* Master Volume */}
        <div className="control-group">
          <label htmlFor="master-volume-slider">Master Volume:</label>
          <input
            id="master-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
          />
          <span>{masterVolume.toFixed(2)}</span>
        </div>

        {/* Oscillator Type Selection */}
        <div className="control-group">
          <label>Oscillator Type:</label>
          <div className="radio-group">
            <input type="radio" id="sine" name="oscType" value="sine" checked={oscillatorType === 'sine'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="sine">Sine</label>
            <input type="radio" id="sawtooth" name="oscType" value="sawtooth" checked={oscillatorType === 'sawtooth'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="sawtooth">Sawtooth</label>
            <input type="radio" id="triangle" name="oscType" value="triangle" checked={oscillatorType === 'triangle'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="triangle">Triangle</label>
            <input type="radio" id="square" name="oscType" value="square" checked={oscillatorType === 'square'} onChange={(e) => setOscillatorType(e.target.value)} /><label htmlFor="square">Square</label>
          </div>
        </div>

        {/* ADSR Controls */}
        <div className="control-group adsr-controls">
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
        <div className="control-group">
          <h3>Delay</h3>
          <div>
            <label htmlFor="delay-slider">Wet Mix:</label>
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
            <label htmlFor="delay-feedback-slider">Feedback:</label>
            <input
              id="delay-feedback-slider"
              type="range"
              min="0"
              max="0.95"
              step="0.01"
              value={delayFeedback}
              onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
            />
            <span>{delayFeedback.toFixed(2)}</span>
          </div>
        </div>

        {/* Reverb Control */}
        <div className="control-group">
          <h3>Reverb</h3>
          <div>
            <label htmlFor="reverb-slider">Wet Mix:</label>
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
          <div>
            <label htmlFor="reverb-decay-slider">Decay (s):</label>
            <input
              id="reverb-decay-slider"
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={reverbDecay}
              onChange={(e) => setReverbDecay(parseFloat(e.target.value))}
            />
            <span>{reverbDecay.toFixed(1)}s</span>
          </div>
        </div>
      </div> {/* End controls-panel */}

      {/* Visual Keyboard */}
      <div className="keyboard-container">
        <h2>Keyboard</h2>
        {renderKeyRow(keyboardLayout.octaveUp, 'Octave Up', 2)}
        {renderKeyRow(keyboardLayout.baseOctave, 'Base Octave', 1)}
        {renderKeyRow(keyboardLayout.octaveDown, 'Octave Down', 0)}
      </div>
    </div>
  );
};

export default MaqamSynth;