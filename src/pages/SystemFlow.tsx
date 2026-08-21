import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function SystemFlow() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Cafe");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const navigate = useNavigate();

  const handleRunSystem = async () => {
    if (!location || !category) return;
    setIsScanning(true);
    
    // UI steps for visual feedback
    setTimeout(() => setScanStep(1), 1000); // Resolving cities
    setTimeout(() => setScanStep(2), 2500); // Intercepting Network Payloads
    setTimeout(() => setScanStep(3), 4000); // Deduplicating Extracted Data
    
    try {
       const res = await fetch("/api/leads/discover", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ query: `${category} in ${location}`, location, category })
       });
       const data = await res.json();
       
       // Proceed with the results
       setTimeout(() => {
         navigate('/pipeline', { state: { location: `${category} in ${location}`, leads: data.results || [] } });
       }, 5500);
    } catch (err) {
       console.error("Failed to discover leads", err);
       setTimeout(() => {
         navigate('/pipeline', { state: { location: `${category} in ${location}`, leads: [] } });
       }, 2000);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      <AnimatePresence mode="wait">
        {!isScanning ? (
          <motion.div 
            key="input-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] p-10 py-12 max-w-[400px] w-full text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100"
          >
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/30">
              <MapPin size={28} />
            </div>
            
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Search Parameters</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed px-4">
              Enter your target category and region to start extracting local businesses.
            </p>

            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Target Category (e.g., Cafe, Dentist)"
                className="w-full pl-12 pr-4 py-4 bg-transparent border border-gray-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
              />
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <MapPin size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Country or Region (e.g., India)"
                className="w-full pl-12 pr-4 py-4 bg-transparent border border-gray-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleRunSystem()}
              />
            </div>

            <button 
              onClick={handleRunSystem}
              disabled={!location || !category}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all mb-6"
            >
              Run Extraction
            </button>

            <button onClick={() => navigate(-1)} className="text-xs font-medium text-gray-400 hover:text-gray-600">
              Go Back
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="scanning-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-12 max-w-[420px] w-full text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100"
          >
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border border-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-2 border border-blue-200 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30">
                  <MapPin size={24} fill="currentColor" />
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Extracting Network Data</h2>
            <p className="text-gray-500 text-sm mb-6">
              Finding real businesses across multiple cities...
            </p>

            <div className="flex flex-col items-center justify-center gap-2 text-sm font-medium mb-4 h-16 relative">
              <AnimatePresence mode="wait">
                {scanStep === 0 && (
                   <motion.div key="step-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute text-blue-600 flex items-center gap-2">
                     <Search size={14} /> <span>Deploying Headless Scrapers...</span>
                   </motion.div>
                )}
                {scanStep === 1 && (
                   <motion.div key="step-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute text-purple-600 flex items-center gap-2">
                     <Search size={14} /> <span>Resolving top cities in region...</span>
                   </motion.div>
                )}
                {scanStep === 2 && (
                   <motion.div key="step-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute text-emerald-600 flex items-center gap-2">
                     <Search size={14} /> <span>Mapping Google Places API payloads...</span>
                   </motion.div>
                )}
                {scanStep === 3 && (
                   <motion.div key="step-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute text-amber-600 flex items-center gap-2">
                     <Search size={14} /> <span>Deduplicating & scoring leads...</span>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-1.5 h-4">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-2 h-2 rounded-full bg-blue-600"></motion.div>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-blue-600"></motion.div>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-blue-600"></motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
