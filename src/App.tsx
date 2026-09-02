import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StockAnalysis } from "./pages/StockAnalysis";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col font-sans">
          <Routes>
            <Route path="/" element={<StockAnalysis />} />
            <Route path="/stock" element={<StockAnalysis />} />
            <Route path="/stock/:ticker" element={<StockAnalysis />} />
            <Route path="*" element={<StockAnalysis />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
