import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoadingScreenProps {
  businessName: string;
  onFinished?: () => void;
}

export function LoadingScreen({ businessName, onFinished }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "revealing" | "done">("loading");
  const [visible, setVisible] = useState(true);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((old) => {
        const increment = Math.random() * 0.04 + 0.02;
        const next = old + increment;
        if (next >= 1) {
          clearInterval(interval);
          return 1;
        }
        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 1 && phase === "loading") {
      setPhase("revealing");
      const done = setTimeout(() => {
        setPhase("done");
        setVisible(false);
        if (onFinishedRef.current) onFinishedRef.current();
      }, 900);
      return () => clearTimeout(done);
    }
  }, [progress, phase]);

  if (phase === "done" || !visible) return null;

  const chars = businessName.split("");

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-loader"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.08, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white pointer-events-none select-none"
      >
        {/* Ambient pulsing radial glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "50vw",
            height: "50vw",
            maxWidth: "600px",
            maxHeight: "600px",
            background: "radial-gradient(circle, rgba(15, 23, 42, 0.04) 0%, transparent 70%)",
            animation: "nexvora-pulse 4s ease-in-out infinite",
          }}
        />

        {/* Letter-by-letter cinematic reveal */}
        <div className="flex gap-[0.04em] font-sans text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-[0.18em] uppercase text-slate-900 z-10 flex-wrap justify-center px-8">
          {chars.map((char, i) => {
            const isSpace = char === " ";
            const revealed = progress > (i / chars.length) * 0.7;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{
                  opacity: revealed ? 1 : 0.05,
                  y: revealed ? 0 : 30,
                  filter: revealed ? "blur(0px)" : "blur(10px)",
                }}
                transition={{
                  duration: 0.9,
                  delay: i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="inline-block"
                style={{ minWidth: isSpace ? "0.3em" : undefined }}
              >
                {isSpace ? "\u00A0" : char}
              </motion.span>
            );
          })}
        </div>

        {/* Ultra-thin progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 w-[180px] h-[2px] bg-slate-100 rounded-full overflow-hidden z-10"
        >
          <div
            className="h-full bg-gradient-to-r from-slate-800 to-slate-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </motion.div>

        {/* Cinematic subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "revealing" ? 1 : 0.4 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-5 text-[10px] font-sans font-medium tracking-[0.35em] uppercase text-slate-400 z-10"
        >
          Lead Discovery & Automation
        </motion.p>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes nexvora-pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.15); opacity: 1; }
          }
        `}} />
      </motion.div>
    </AnimatePresence>
  );
}
