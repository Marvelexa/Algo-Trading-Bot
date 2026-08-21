import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StockAnalysis } from "./pages/StockAnalysis";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col font-sans">
        <Routes>
          {/* Nexvora AI Stock Research Analyst as Primary Main Application */}
          <Route path="/" element={<StockAnalysis />} />
          <Route path="/stock" element={<StockAnalysis />} />
          <Route path="/stock/:ticker" element={<StockAnalysis />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
