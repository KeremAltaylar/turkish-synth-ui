import React from 'react';

const KeyboardInfo = () => {
  return (
    <div className="keyboard-info">
      <p>Base Octave: <kbd>a</kbd><kbd>s</kbd><kbd>d</kbd><kbd>f</kbd><kbd>g</kbd><kbd>h</kbd><kbd>j</kbd><kbd>k</kbd><kbd>l</kbd><kbd>ş</kbd></p>
      <p>Octave Down: <kbd>z</kbd><kbd>x</kbd><kbd>c</kbd><kbd>v</kbd><kbd>b</kbd><kbd>n</kbd><kbd>m</kbd><kbd>ö</kbd><kbd>ç</kbd></p>
      <p>Octave Up: <kbd>q</kbd><kbd>w</kbd><kbd>e</kbd><kbd>r</kbd><kbd>t</kbd><kbd>y</kbd><kbd>u</kbd><kbd>ı</kbd><kbd>o</kbd></p>
    </div>
  );
};

export default KeyboardInfo;