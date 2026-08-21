import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Import compiled Tailwind CSS directly as a raw string for Shadow DOM injection
import tailwindStyle from './index.css?inline';
import { runPhoneUnitTests } from './utils/phoneNormalizer';

/**
 * Enterprise Injector Bootstrap
 * Sets up isolated Shadow DOM and injects compiled Tailwind CSS directly
 * inside the Shadow Root to ensure zero style leakage and perfect styling.
 */
function bootstrapNexvora() {
  // Execute startup phone normalizer unit tests
  runPhoneUnitTests();

  // Prevent duplicate rendering
  if (document.getElementById('nexvora-extension-host')) return;

  const host = document.createElement('div');
  host.id = 'nexvora-extension-host';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create isolated style element inside Shadow Root
  const styleElement = document.createElement('style');
  styleElement.textContent = tailwindStyle;
  shadowRoot.appendChild(styleElement);

  // Render anchor container
  const container = document.createElement('div');
  container.id = 'nexvora-app-container';
  shadowRoot.appendChild(container);

  // Mount React inside shadow containment
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Bootstrap once DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrapNexvora();
} else {
  window.addEventListener('DOMContentLoaded', bootstrapNexvora);
}
