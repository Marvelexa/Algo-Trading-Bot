import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, Lock, Smartphone, Laptop, KeyRound, AlertCircle, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [pin, setPin] = useState<string>("");
  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("");
  const [mode, setMode] = useState<"PIN" | "PASSWORD">("PIN");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      setError("Please enter a valid 4-to-6 digit security PIN.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await login(pin, "admin");
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      setPin("");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await login(password, username);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4 && nextPin === "8888") {
        // Instant auto-submit on complete 4-digit PIN
        setTimeout(() => {
          login(nextPin, "admin");
        }, 100);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleKeypadClear = () => {
    setPin("");
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#070a12] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#070a12] to-black flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative z-10">
        {/* Terminal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-0.5 shadow-lg shadow-indigo-500/25 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            NEXVORA <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">STOCK AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Central Institutional Trading Terminal · Protected
          </p>
        </div>

        {/* Sync Guarantee Banner */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 mb-5 flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1 text-indigo-400 shrink-0">
            <Laptop className="w-4 h-4" />
            <span className="text-[10px]">⇄</span>
            <Smartphone className="w-4 h-4" />
          </div>
          <p className="leading-snug">
            <strong className="text-white">Unified Session:</strong> Login on mobile or laptop keeps the single 24/7 background trade session active.
          </p>
        </div>

        {/* Mode Selector Tab */}
        <div className="flex p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setMode("PIN"); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "PIN"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Quick PIN Access
          </button>
          <button
            type="button"
            onClick={() => { setMode("PASSWORD"); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "PASSWORD"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            User & Password
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 mb-4 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN MODE FORM */}
        {mode === "PIN" && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="text-center">
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Enter 4-Digit Security Terminal PIN
              </label>

              {/* PIN Visual Dots */}
              <div className="flex justify-center items-center gap-3 my-3">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                      pin.length > idx
                        ? "bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/50"
                        : "bg-slate-950 border-slate-700"
                    }`}
                  />
                ))}
              </div>

              {/* Hidden/Keyboard Input for Desktop typing */}
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Type PIN..."
                autoFocus
                className="w-full text-center text-lg tracking-[0.5em] bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            {/* Mobile / Screen Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((btn) => {
                const isClear = btn === "C";
                const isBackspace = btn === "⌫";
                const isAction = isClear || isBackspace;

                return (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (isClear) handleKeypadClear();
                      else if (isBackspace) handleKeypadBackspace();
                      else handleKeypadPress(btn);
                    }}
                    className={`h-12 rounded-xl text-base font-bold transition-all active:scale-95 flex items-center justify-center ${
                      isAction
                        ? "bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/50"
                        : "bg-slate-950/90 border border-slate-800 text-white hover:bg-indigo-600/20 hover:border-indigo-500/50 shadow-sm"
                    }`}
                  >
                    {btn}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Unlock Terminal Session
                </>
              )}
            </button>
          </form>
        )}

        {/* USERNAME & PASSWORD FORM */}
        {mode === "PASSWORD" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Security Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Hint Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-full border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Default Terminal PIN: <strong className="text-white font-mono">8888</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
