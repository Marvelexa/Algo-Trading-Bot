import { motion, AnimatePresence } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { REVIEWS } from '../constants';
import { useState } from 'react';

export default function Reviews() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % REVIEWS.length);
  const prev = () => setCurrent((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);

  return (
    <section id="reviews" className="bg-brand-cream py-32 px-4 md:px-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-[1500px] mx-auto relative z-10">
        <div className="text-center mb-24">
          <Quote className="w-16 h-16 text-brand-red mx-auto mb-8 opacity-10" />
          <h2 className="text-5xl md:text-7xl font-serif font-black text-brand-brown mb-4 italic">Guest Reviews</h2>
          <span className="text-brand-brown/40 text-[10px] font-black uppercase tracking-[0.6em]">What People Say</span>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="overflow-hidden px-4 py-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={current}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="text-center bg-white p-12 md:p-24 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(45,27,20,0.15)] border border-brand-brown/5 relative"
              >
                <div className="flex justify-center mb-12 gap-2">
                  {[...Array(REVIEWS[current].rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-brand-orange fill-brand-orange" />
                  ))}
                </div>
                <p className="text-2xl md:text-4xl text-brand-brown font-serif mb-16 leading-[1.4] italic font-black">
                  "{REVIEWS[current].comment}"
                </p>
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <img 
                      src={REVIEWS[current].image} 
                      className="w-24 h-24 rounded-3xl object-cover ring-8 ring-brand-cream p-1.5 bg-white shadow-2xl" 
                      alt={REVIEWS[current].name}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-brand-red p-2 rounded-xl shadow-lg">
                      <Quote className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h4 className="text-brand-brown text-sm font-black uppercase tracking-[0.3em]">{REVIEWS[current].name}</h4>
                  <span className="text-brand-orange text-[10px] font-black uppercase tracking-widest mt-2">Verified Customer</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 -left-2 md:-left-24 z-20">
            <button onClick={prev} className="w-16 h-16 rounded-2xl bg-brand-brown text-white flex items-center justify-center hover:bg-brand-red hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-brand-brown/20 group">
              <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-2 md:-right-24 z-20">
            <button onClick={next} className="w-16 h-16 rounded-2xl bg-brand-brown text-white flex items-center justify-center hover:bg-brand-red hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-brand-brown/20 group">
              <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
