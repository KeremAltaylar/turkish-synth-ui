import React from 'react';

const SynthControls = ({ 
  currentMaqam, setCurrentMaqam, tMaqamsIntervals,
  rootNoteOffset, setRootNoteOffset,
  oscillatorType, setOscillatorType,
  attack, setAttack, decay, setDecay, sustain, setSustain, release, setRelease,
  delayAmount, setDelayAmount, delayFeedback, setDelayFeedback,
  reverbAmount, setReverbAmount
}) => {
  return (
    <div className="synth-controls-container">
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
        <div className="control-item">
          <label htmlFor="attack-slider">Attack:</label>
          <input type="range" id="attack-slider" min="0.001" max="2" step="0.001" value={attack} onChange={(e) => setAttack(parseFloat(e.target.value))} />
          <span>{attack.toFixed(3)}s</span>
        </div>
        <div className="control-item">
          <label htmlFor="decay-slider">Decay:</label>
          <input type="range" id="decay-slider" min="0.01" max="2" step="0.01" value={decay} onChange={(e) => setDecay(parseFloat(e.target.value))} />
          <span>{decay.toFixed(2)}s</span>
        </div>
        <div className="control-item">
          <label htmlFor="sustain-slider">Sustain:</label>
          <input type="range" id="sustain-slider" min="0" max="1" step="0.01" value={sustain} onChange={(e) => setSustain(parseFloat(e.target.value))} />
          <span>{sustain.toFixed(2)}</span>
        </div>
        <div className="control-item">
          <label htmlFor="release-slider">Release:</label>
          <input type="range" id="release-slider" min="0.01" max="3" step="0.01" value={release} onChange={(e) => setRelease(parseFloat(e.target.value))} />
          <span>{release.toFixed(2)}s</span>
        </div>
      </div>

      {/* Delay Control */}
      <div className="control-group">
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
      <div className="control-group">
        <label htmlFor="delay-feedback-slider">Delay Feedback:</label>
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

      {/* Reverb Control */}
      <div className="control-group">
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
  );
};

export default SynthControls;