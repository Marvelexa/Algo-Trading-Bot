import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Truck } from 'lucide-react';


export default function Hero() {
  // Read real business photos from Google Maps (passed via query params)
  const getPhotosFromParams = (): string[] => {
    try {
      const raw = new URLSearchParams(window.location.search).get('photos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };
  const mapsPhotos = getPhotosFromParams();

  const THUMBNAILS = [
    mapsPhotos[0] || "https://ik.imagekit.io/nwcatqsgu/51820b5b4bc4c7333fa9096b124c6480-Photoroom.png",
    mapsPhotos[1] || "https://ik.imagekit.io/nwcatqsgu/ac4382d8-b915-4bb7-9702-3dcf083b1402-Photoroom.png",
    mapsPhotos[2] || "https://ik.imagekit.io/nwcatqsgu/594848b5-c354-43e4-a433-d10c35d60a48-Photoroom.png"
  ];

  const targetRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  // Green Coffee Scroll Animations
  const greenX = useTransform(scrollYProgress, [0, 0.2, 0.75, 0.85, 1], ["0%", "200%", "200%", "-55%", "-55%"]);
  const greenRotate = useTransform(scrollYProgress, [0, 0.2, 0.75, 0.85, 1], [0, 45, 45, -15, -15]);
  const greenScale = useTransform(scrollYProgress, [0.75, 0.85, 1], [1, 0.8, 0.8]);
  const greenY = useTransform(scrollYProgress, [0.75, 0.85, 1], ["0%", "10%", "10%"]);

  // Brown Coffee Scroll Animations
  const brownX = useTransform(scrollYProgress, [0.1, 0.3, 0.4, 0.6, 0.75, 0.85, 1], ["200%", "0%", "0%", "200%", "200%", "0%", "0%"]);
  const brownRotate = useTransform(scrollYProgress, [0.1, 0.3, 0.4, 0.6, 0.75, 0.85, 1], [45, 0, 0, 45, 45, 0, 0]);
  const brownScale = useTransform(scrollYProgress, [0.75, 0.85, 1], [1, 1.1, 1.1]);
  const brownY = useTransform(scrollYProgress, [0.75, 0.85, 1], ["0%", "0%", "0%"]);

  // Third Coffee Scroll Animations
  const thirdX = useTransform(scrollYProgress, [0.5, 0.7, 0.75, 0.85, 1], ["200%", "0%", "0%", "55%", "55%"]);
  const thirdRotate = useTransform(scrollYProgress, [0.5, 0.7, 0.75, 0.85, 1], [45, 0, 0, 15, 15]);
  const thirdScale = useTransform(scrollYProgress, [0.75, 0.85, 1], [1, 0.8, 0.8]);
  const thirdY = useTransform(scrollYProgress, [0.75, 0.85, 1], ["0%", "10%", "10%"]);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 100, damping: 20 }
    }
  };

  return (
    <section id="home" ref={targetRef} className="relative w-full h-[650vh]">
     <div className="sticky top-0 w-full h-screen min-h-[600px] flex items-center pt-16 font-sans bg-gradient-to-br from-[#1A2F22] to-primary overflow-hidden">
      {/* Right curved shape background */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 50, delay: 0.1 }}
        className="absolute right-0 top-0 bottom-0 w-[50%] lg:w-[40%] bg-accent rounded-l-[40px] lg:rounded-l-[80px] z-0 shadow-2xl"
      >
        {/* Vertical Typography */}
        <div className="absolute right-2 sm:right-4 lg:right-6 top-1/2 -translate-y-1/2 h-full flex flex-col justify-center items-center gap-12 opacity-30 select-none overflow-hidden mix-blend-overlay">
           <span className="text-[40px] sm:text-[50px] lg:text-[60px] xl:text-[80px] font-black text-transparent uppercase tracking-tight"
                 style={{ WebkitTextStroke: '2px rgba(245, 230, 211, 0.8)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
              FRAPPUCCINO
           </span>
           <span className="hidden lg:block text-[40px] sm:text-[50px] lg:text-[60px] xl:text-[80px] font-black text-secondary uppercase tracking-tight"
                 style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
              FRAPPUCCINO
           </span>
        </div>
      </motion.div>

      <div className="w-full max-w-none pl-4 sm:pl-6 lg:pl-16 pr-0 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-10 items-center">
         
         {/* Left Content */}
         <motion.div
           variants={containerVars}
           initial="hidden"
           animate="visible"
           className="flex flex-col lg:mt-0"
         >
            <motion.h3 variants={itemVars} className="text-accent text-base sm:text-lg lg:text-xl font-bold tracking-[0.2em] uppercase mb-2 sm:mb-4 leading-tight drop-shadow-md">
              Roastery is...
            </motion.h3>

            <motion.h1 variants={itemVars} className="text-5xl sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] font-black text-secondary leading-[1] tracking-tighter mb-6 lg:mb-8 drop-shadow-lg relative z-20">
              PURE LOVE <br />
              OF COFFEE
            </motion.h1>

            <motion.div variants={itemVars} className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 mb-8 lg:mb-12 relative z-20">
              <div className="flex flex-col border-r border-secondary/20 pr-4 lg:pr-8">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-secondary">5.65$</span>
                <span className="text-[10px] sm:text-xs font-bold text-secondary/80 uppercase tracking-[0.2em] mt-1 lg:mt-2">For Sale!</span>
              </div>

              <a href="#menu" className="flex items-center gap-2 sm:gap-3 bg-secondary text-primary px-5 sm:px-6 lg:px-8 py-3 sm:py-3.5 rounded-full font-bold uppercase tracking-wider text-xs lg:text-sm shadow-[0_10px_40px_-10px_rgba(245,230,211,0.3)] hover:bg-white hover:scale-105 hover:shadow-[0_15px_50px_-10px_rgba(245,230,211,0.4)] transition-all touch-manipulation group text-center">
                <span className="bg-primary p-1.5 lg:p-2 rounded-full group-hover:rotate-12 transition-transform duration-300">
                   <Truck className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-secondary" />
                </span>
                Free Delivery
              </a>
            </motion.div>

            {/* Thumbnails row */}
            <motion.div variants={itemVars} className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pb-2 lg:pb-8 relative z-20">
               <div className="flex gap-2 sm:gap-3 lg:gap-4">
                  {THUMBNAILS.map((src, idx) => (
                    <div key={idx} className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl bg-white border-[3px] lg:border-4 border-transparent hover:border-accent transition-all duration-300 overflow-hidden flex items-center justify-center p-1 sm:p-2 cursor-pointer shadow-xl group">
                       <img src={src} referrerPolicy="no-referrer" className={mapsPhotos[idx] ? "object-cover w-full h-full rounded-xl drop-shadow-md group-hover:scale-110 transition-transform duration-500" : "w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500"} alt={`Coffee type ${idx + 1}`} />
                    </div>
                  ))}
               </div>
               <div className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold tracking-[0.2em] text-secondary/60 uppercase max-w-[120px] leading-loose sm:pb-1 lg:pb-2">
                 Roastery <br/> Specialties
               </div>
            </motion.div>
         </motion.div>

         {/* Right Floating Image Container */}
         <div className="relative w-full h-[50vh] lg:h-full flex items-center justify-center lg:justify-end lg:pr-32 xl:pr-48 2xl:pr-64 mt-4 lg:mt-0 pointer-events-none mb-4 lg:mb-0">
            
            {/* Green Coffee Container */}
            <motion.div style={{ x: greenX, y: greenY, rotate: greenRotate, scale: greenScale }} className="absolute z-10 w-[200px] sm:w-[240px] lg:w-[300px] xl:w-[350px] 2xl:w-[400px]">
               <motion.div
                initial={{ x: '100vw', rotate: 25, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, rotate: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 45, delay: 0.4 }}
                className="w-full flex items-center justify-center transform origin-bottom-right"
              >
                 <motion.div
                   animate={{ y: [0, -25, 0], rotate: [0, -2, 0] }}
                   transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                 >
                   <img
                     src={mapsPhotos[0] || "https://ik.imagekit.io/nwcatqsgu/51820b5b4bc4c7333fa9096b124c6480-Photoroom.png"}
                     alt="Featured Artisanal Matcha Frappuccino"
                     referrerPolicy="no-referrer"
                     className={mapsPhotos[0] ? "object-cover w-full h-full rounded-xl drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]" : "w-full h-auto object-contain object-center scale-100 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"}
                   />
                 </motion.div>
               </motion.div>
            </motion.div>

            {/* Third Coffee Container */}
            <motion.div style={{ x: thirdX, y: thirdY, rotate: thirdRotate, scale: thirdScale }} className="absolute z-10 w-[200px] sm:w-[240px] lg:w-[300px] xl:w-[350px] 2xl:w-[400px]">
               <motion.div className="w-full flex items-center justify-center transform origin-bottom-right">
                 <motion.div
                   animate={{ y: [0, -20, 0], rotate: [0, -2, 0] }}
                   transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                 >
                   <img
                     src={mapsPhotos[2] || "https://ik.imagekit.io/nwcatqsgu/594848b5-c354-43e4-a433-d10c35d60a48-Photoroom.png"}
                     alt="Featured Artisanal Pink Drink"
                     referrerPolicy="no-referrer"
                     className={mapsPhotos[2] ? "object-cover w-full h-full rounded-xl drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]" : "w-full h-auto object-contain object-center scale-100 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"}
                   />
                 </motion.div>
               </motion.div>
            </motion.div>

            {/* Brown Coffee Container */}
            <motion.div style={{ x: brownX, y: brownY, rotate: brownRotate, scale: brownScale }} className="absolute z-30 w-[200px] sm:w-[240px] lg:w-[300px] xl:w-[350px] 2xl:w-[400px]">
               <motion.div className="w-full flex items-center justify-center transform origin-bottom-right">
                 <motion.div
                   animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
                   transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                 >
                   <img
                     src={mapsPhotos[1] || "https://ik.imagekit.io/nwcatqsgu/ac4382d8-b915-4bb7-9702-3dcf083b1402-Photoroom.png"}
                     alt="Featured Artisanal Frappuccino"
                     referrerPolicy="no-referrer"
                     className={mapsPhotos[1] ? "object-cover w-full h-full rounded-xl drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]" : "w-full h-auto object-contain object-center scale-100 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"}
                   />
                 </motion.div>
               </motion.div>
            </motion.div>
         </div>

      </div>
     </div>
    </section>
  );
}
