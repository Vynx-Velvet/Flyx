import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { MediaProvider } from './context/mediaContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MediaProvider>
      <App />
    </MediaProvider>
  </React.StrictMode>
);

