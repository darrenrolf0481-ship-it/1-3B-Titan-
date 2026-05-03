import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import NexusPlatform from '../app/NexusPlatform';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NexusPlatform />
  </StrictMode>
);
