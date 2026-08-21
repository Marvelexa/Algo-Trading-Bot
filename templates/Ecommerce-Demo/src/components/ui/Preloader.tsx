"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const renderStylizedName = (name: string) => {
  return name.split("").map((char, index) => {
    if (char === "A" || char === "a") {
      return (
        <span key={index} className="stylized-a text-accent-blue">
          Λ
        </span>
      );
    }
    return char;
  });
};

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [businessName, setBusinessName] = useState("MARVELEXA");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = new URLSearchParams(window.location.search).get("name");
      if (name) {
        setBusinessName(name.toUpperCase());
      }
    }
  }, []);

  const loadingSteps = [
    "Curating your wardrobe...",
    "Sourcing premium fabrics...",
    `Powering up ${businessName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}...`,
    "Preparing the runway...",
    "Final quality check..."
  ];

  useEffect(() => {
    // Dynamic organic progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsDone(true);
          return 100;
        }
        // Simulates realistic network speeds (slowing down towards 95%)
        const increment = prev > 80 
          ? Math.random() * 3 + 0.5 
          : Math.random() * 15 + 5;
        return Math.min(100, prev + increment);
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % loadingSteps.length);
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000); // Increased slightly to let the spring panels settle fully
      return () => clearTimeout(timer);
    }
  }, [isDone, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white overflow-hidden"
    >
      {/* Split Reveal sliding panels - Custom Luxury Easing */}
      <div className="absolute inset-0 flex pointer-events-none z-20">
        <motion.div 
          initial={{ x: "0%" }}
          animate={isDone ? { x: "-100%" } : { x: "0%" }}
          transition={{ duration: 1.1, ease: [0.85, 0, 0.15, 1] }}
          className="w-1/2 h-full bg-white border-r border-slate-100/50 shadow-[30px_0_60px_rgba(0,0,0,0.03)]"
        />
        <motion.div 
          initial={{ x: "0%" }}
          animate={isDone ? { x: "100%" } : { x: "0%" }}
          transition={{ duration: 1.1, ease: [0.85, 0, 0.15, 1] }}
          className="w-1/2 h-full bg-white border-l border-slate-100/50 shadow-[-30px_0_60px_rgba(0,0,0,0.03)]"
        />
      </div>

      <div className="relative z-30 flex flex-col items-center gap-14 w-full max-w-xs px-6">
        
        {/* Brand Logo & Est - slow float & pulse scale */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
          }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <motion.h1 
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="font-sans font-black tracking-[0.25em] text-3xl uppercase text-slate-800 text-center"
          >
            {renderStylizedName(businessName)}
          </motion.h1>
          
          <div className="flex items-center gap-2">
            <span className="w-8 h-[1px] bg-blue-500/20" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-blue">Est. 2026</span>
            <span className="w-8 h-[1px] bg-blue-500/20" />
          </div>
        </motion.div>

        {/* Progress bar and cycling text */}
        <div className="w-full space-y-4">
          <div className="h-[2px] w-full bg-slate-100 rounded-full overflow-hidden relative">
            {/* Smooth transition on width change */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              className="absolute inset-y-0 left-0 bg-accent-blue shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            />
          </div>
          
          <div className="flex flex-col items-center justify-center h-4 overflow-hidden">
            <AnimatePresence mode="wait">
              {!isDone && (
                <motion.p
                  key={stepIndex}
                  initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center"
                >
                  {loadingSteps[stepIndex]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pulsing visual light ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
        High-End Fashion Syndicate
      </div>
    </motion.div>
  );
}
