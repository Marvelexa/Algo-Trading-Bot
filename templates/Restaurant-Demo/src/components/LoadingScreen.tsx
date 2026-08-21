import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoadingScreenProps {
  businessName: string;
  onFinished?: () => void;
}

export default function LoadingScreen({ businessName, onFinished }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "revealing" | "done">("loading");
  const [visible, setVisible] = useState(true);

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
    if (progress >= 1) {
      setPhase("revealing");
      const done = setTimeout(() => {
        setPhase("done");
        setVisible(false);
        if (onFinished) onFinished();
      }, 1400);
      return () => clearTimeout(done);
    }
  }, [progress, onFinished]);

  if (phase === "done" || !visible) return null;

  const chars = businessName.split("");

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-loader"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.08, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center pointer-events-none select-none"
        style={{ backgroundColor: "#FAF1E4" }}
      >
        {/* Ambient pulsing radial glow - warm gold */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "50vw",
            height: "50vw",
            maxWidth: "600px",
            maxHeight: "600px",
            background: "radial-gradient(circle, rgba(212, 175, 55, 0.06) 0%, transparent 70%)",
            animation: "nexvora-pulse 4s ease-in-out infinite",
          }}
        />

        {/* Letter-by-letter cinematic reveal */}
        <div
          className="flex gap-[0.04em] text-3xl sm:text-5xl md:text-6xl font-bold tracking-[0.16em] uppercase z-10 flex-wrap justify-center px-8"
          style={{ fontFamily: "'Playfair Display', serif", color: "#2D1B14" }}
        >
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
          className="mt-10 w-[180px] h-[2px] rounded-full overflow-hidden z-10"
          style={{ backgroundColor: "rgba(45, 27, 20, 0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(to right, #D4AF37, #c5a059)",
            }}
          />
        </motion.div>

        {/* Cinematic subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "revealing" ? 1 : 0.4 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-5 text-[10px] font-medium tracking-[0.35em] uppercase z-10"
          style={{ fontFamily: "'Inter', sans-serif", color: "rgba(212, 175, 55, 0.6)" }}
        >
          Fine Dining & Gastronomy
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
