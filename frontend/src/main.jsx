import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Global scroll-lock cleanup to prevent UI freezing
setInterval(() => {
  const elements = [document.body, document.documentElement];
  elements.forEach(el => {
    if (el.hasAttribute('data-scroll-locked')) {
      el.removeAttribute('data-scroll-locked');
    }
    if (el.style.pointerEvents === 'none') {
      el.style.pointerEvents = '';
    }
    if (el.style.overflow === 'hidden' || el.style.overflowY === 'hidden') {
      el.style.overflow = '';
      el.style.overflowY = '';
    }
  });
}, 500);
