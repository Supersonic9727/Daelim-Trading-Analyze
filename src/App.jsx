import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Dashboard />
      <Analytics />
    </div>
  );
}

export default App;
