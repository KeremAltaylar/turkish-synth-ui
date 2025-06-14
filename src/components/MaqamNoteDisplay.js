import React from 'react';

const MaqamNoteDisplay = ({ maqamNotes, frequencyToNoteName, activeNotes = new Map() }) => {
  return (
    <div className="note-display-section">
      <h2>Maqam Notes:</h2>
      <div className="note-grid">
        {maqamNotes.map((note, index) => {
          // Check if this note frequency is currently being played
          const isActive = Array.from(activeNotes.values()).some(
            activeFreq => Math.abs(activeFreq - note) < 0.01
          );
          
          return (
            <span 
              key={index} 
              className={`note-button ${isActive ? 'active' : ''}`}
            >
              {frequencyToNoteName(note)}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default MaqamNoteDisplay;