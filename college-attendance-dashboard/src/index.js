import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Set CSS variable for auth background to point at public image at runtime.
// Place the image at: public/images/jims-hd.jpg
try {
  const publicUrl = process.env.PUBLIC_URL || '';
  // value must include url(...) so CSS variable can be used directly in background-image
  const imgUrl = `url('${publicUrl}/images/jims-hd.jpg')`;
  document.documentElement.style.setProperty('--auth-bg', imgUrl);
} catch (e) {
  // ignore in environments where document isn't available
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
