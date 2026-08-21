"use client";

import React, { useState } from "react";
import Button from "../ui/Button";
import { FiMail, FiCheck } from "react-icons/fi";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      setEmail("");
    }, 2000);
  };

  return (
    <section 
      id="newsletter" 
      className="relative py-32 bg-white border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-10">
          
          <div className="space-y-4">
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-accent-blue font-bold block">
              Marvelexa Registry
            </span>
            <h2 className="font-serif font-bold text-4xl md:text-5xl uppercase tracking-tighter text-slate-800 leading-none">
              Privileged Access.
            </h2>
            <p className="font-sans text-xs text-slate-500 leading-relaxed font-light">
              Subscribe to receive exclusive access keys, limited-edition catalog drops, and seasonal brand campaigns.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative max-w-md mx-auto space-y-4">
            {submitted ? (
              <div className="p-6 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center gap-3 text-green-700">
                <FiCheck className="w-5 h-5" />
                <span className="font-sans font-bold text-xs uppercase tracking-wider">Access Registry Granted</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <FiMail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ENTER YOUR REGISTRY EMAIL"
                    className="w-full pl-12 pr-6 py-4.5 rounded-full bg-slate-50 border border-slate-200 focus:border-slate-300 text-xs font-sans tracking-wider text-slate-800 focus:outline-none placeholder-slate-400 uppercase"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-accent-blue text-white hover:bg-blue-700 py-4 px-8 border-0"
                  glow
                >
                  Join Registry
                </Button>
              </div>
            )}
          </form>

        </div>
      </div>
    </section>
  );
}
