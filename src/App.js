// src/App.js
import React from 'react';
import './App.css';

import MaqamSynth from './components/MaqamSynth'; // <--- Make sure this import is here

function App() {
  return (
    <div>
      <MaqamSynth /> {/* <--- Make sure this component is rendered here */}
    </div>
  );
}

export default App;