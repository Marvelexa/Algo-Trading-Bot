import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const HERO_DISHES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
    name: 'Healthy Bowl',
    special: 'Signature Choice'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    name: 'Gourmet Pizza',
    special: 'Wood-fired'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    name: 'Prime Burger',
    special: 'Double Patty'
  }
];

export default function Hero() {
  const getPhotosFromParams = (): string[] => {
    try {
      const raw = new URLSearchParams(window.location.search).get('photos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };
  const mapsPhotos = getPhotosFromParams();
  const foodPhotos = mapsPhotos.slice(1);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % HERO_DISHES.length);
  };

  const prev = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + HERO_DISHES.length) % HERO_DISHES.length);
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      rotate: dir > 0 ? 45 : -45,
      opacity: 0,
      scale: 0.5
    }),
    center: {
      x: 0,
      rotate: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      rotate: dir > 0 ? -45 : 45,
      opacity: 0,
      scale: 0.5
    })
  };

  const currentDish = HERO_DISHES[index];

  return (
    <section className="relative min-h-screen bg-brand-cream pt-24 pb-12 overflow-hidden flex flex-col">
      <div className="flex-1 flex items-center">
        <div className="max-w-[1600px] mx-auto px-4 md:px-12 w-full relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Background Shape */}
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[120%] h-[700px] bg-white rounded-[200px] -rotate-6 z-0 hidden lg:block shadow-inner" />

          {/* Left Content */}
          <div className="relative z-10 text-center lg:text-left">
            <motion.span 
              key={`span-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-brand-red font-bold uppercase tracking-[0.3em] text-sm mb-6 block"
            >
              Our Top {currentDish.special}
            </motion.span>
            
            <AnimatePresence mode="wait">
              <motion.h1 
                key={`h1-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-6xl md:text-8xl font-serif font-black text-brand-brown mb-8 leading-[0.9]"
              >
                {currentDish.name.split(' ')[0]} <br />
                <span className="text-brand-red">{currentDish.name.split(' ')[1]}</span> <br />
                <span className="">Fresh Food</span>
              </motion.h1>
            </AnimatePresence>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-brand-brown/70 text-lg mb-10 max-w-md mx-auto lg:mx-0 font-medium leading-relaxed"
            >
              Enjoy our delicious meals prepared with high-quality ingredients and delivered fresh to you.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center lg:justify-start gap-8"
            >
              <button className="bg-brand-orange text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-brand-red transition-all shadow-xl shadow-brand-orange/20">
                Order {currentDish.name}
              </button>
              
              <div className="hidden sm:block">
                <p className="text-brand-brown/50 text-xs font-bold uppercase tracking-widest leading-loose text-left">
                  Quick, healthy, and <br />
                  delicious chef-crafted <br />
                  Signature dishes
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Rotating Dish Gallery */}
          <div className="relative z-10 flex justify-center items-center h-[500px]">
            
            <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
              
              {/* Navigation Pod */}
              <div className="absolute top-1/2 -translate-y-1/2 -left-12 -right-12 flex justify-between z-50 pointer-events-none">
                <button 
                  onClick={prev}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex items-center justify-center text-brand-brown hover:bg-brand-red hover:text-white transition-all transform hover:scale-110 active:scale-90 pointer-events-auto"
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 h-8" />
                </button>

                <button 
                  onClick={next}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex items-center justify-center text-brand-brown hover:bg-brand-red hover:text-white transition-all transform hover:scale-110 active:scale-90 pointer-events-auto"
                >
                  <ChevronRight className="w-6 h-6 md:w-8 h-8" />
                </button>
              </div>

              {/* Main Active Dish */}
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={index}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 100, damping: 20 },
                    rotate: { type: "spring", stiffness: 100, damping: 20 },
                    opacity: { duration: 0.3 }
                  }}
                  className="absolute inset-0 z-20 flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-[15px] border-white/40 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)]">
                    <img 
                      src={(foodPhotos.length > 0 && foodPhotos[index % foodPhotos.length]) || currentDish.image} 
                      className="w-full h-full object-cover"
                      alt={currentDish.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).src = currentDish.image;
                      }}
                    />
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 bg-brand-brown text-white border-4 border-brand-cream px-8 py-3 rounded-full font-black uppercase tracking-[0.2em] text-[12px] whitespace-nowrap shadow-2xl z-30"
                  >
                    {currentDish.special}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Orbiting Previews */}
              <div className="absolute inset-0 z-10">
                <motion.div 
                  animate={{ rotate: direction > 0 ? -index * 120 : index * 120 }}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                  className="relative w-full h-full"
                >
                  {HERO_DISHES.map((dish, i) => {
                    const isActive = i === index;
                    if (isActive) return null;
                    
                    const angle = (i - index) * 120;
                    return (
                      <motion.div
                        key={dish.id}
                        initial={false}
                        animate={{ 
                          rotate: -angle,
                          x: Math.cos((angle - 90) * (Math.PI / 180)) * 250,
                          y: Math.sin((angle - 90) * (Math.PI / 180)) * 250,
                          scale: 0.4,
                          opacity: 0.15
                        }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full overflow-hidden border-8 border-white/20"
                      >
                        <img src={(foodPhotos.length > 0 && foodPhotos[i % foodPhotos.length]) || dish.image} className="w-full h-full object-cover" alt="Orbiting Dish" referrerPolicy="no-referrer" />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

            </div>

            {/* Decorative items */}
            <div className="absolute top-0 right-0 opacity-10 blur-[1px] pointer-events-none rotate-45 scale-150">
              <img src={mapsPhotos[0] || "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&q=80&w=400"} className="w-40 h-40" alt="Veggie" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
