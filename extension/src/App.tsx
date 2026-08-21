import React from 'react';
import { FloatingPanel } from './components/FloatingPanel';

export const App: React.FC = () => {
  return (
    <div className="text-slate-100 font-sans antialiased">
      {/* 
        This is the root container of the Nexvora app inside the isolated Shadow DOM.
        All layouts, modals, and overlays sit cleanly encapsulated here.
      */}
      <FloatingPanel />
    </div>
  );
};

export default App;
