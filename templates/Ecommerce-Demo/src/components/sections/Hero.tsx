"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface SlideData {
  id: string;
  title: string;
  description: string;
  image: string;
}

const defaultSlides: SlideData[] = [
  {
    id: "1",
    title: "MΛRVELEXΛ | Premium Clothing",
    description: "Discover luxury fashion online. Shop custom night suits, designer plazzos, and everyday casual comfort fits.",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "2",
    title: "Ethnic | & Modern Wear",
    description: "Vibrant hues and precise styling. Handcrafted Kurtis and comfortable loungewear created for any occasion.",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "3",
    title: "Comfort | Redefined",
    description: "Experience premium cotton fabrics designed to glide against your skin. Perfect loungewear and staples.",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1200",
  }
];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides, setSlides] = useState<SlideData[]>(defaultSlides);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawPhotos = searchParams.get('photos');
      const businessName = searchParams.get('name') || '';

      if (rawPhotos) {
        const photos: string[] = JSON.parse(rawPhotos);
        if (Array.isArray(photos) && photos.length > 0) {
          const updated = defaultSlides.map((slide, idx) => ({
            ...slide,
            title: businessName ? `${businessName.toUpperCase()} | Collection` : slide.title,
            image: photos[idx % photos.length] || slide.image
          }));
          setSlides(updated);
        }
      }
    } catch {}
  }, []);

  const paginate = useCallback((newDirection: number) => {
    setCurrentIndex((prev) => (prev + newDirection + slides.length) % slides.length);
  }, [slides.length]);

  // Auto carousel rotation
  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1);
    }, 6000);
    return () => clearInterval(interval);
  }, [paginate]);

  const renderTitle = (title: string) => {
    const parts = title.split("|");
    if (parts.length > 1) {
      return (
        <>
          {parts[0]} <br />
          <span className="italic font-serif font-light text-accent-blue opacity-95">{parts[1]}</span>
        </>
      );
    }
    return title;
  };

  const getSlideStyle = (index: number) => {
    const total = defaultSlides.length;
    let diff = index - currentIndex;

    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const isActive = diff === 0;

    let x = "0%";
    let scale = 1;
    let zIndex = 0;
    let opacity = 1;

    const offset = 90; // percentage slide offset

    if (isActive) {
      x = "0%";
      scale = 1;
      zIndex = 20;
      opacity = 1;
    } else {
      const direction = diff > 0 ? 1 : -1;
      const distance = Math.abs(diff);
      x = `${direction * offset * distance}%`;
      scale = 0.85;
      zIndex = 10 - distance;
      opacity = distance === 1 ? 0.35 : 0;
    }

    return { x, scale, zIndex, opacity };
  };

  return (
    <section 
      id="new-arrivals" 
      className="relative min-h-[85vh] w-full flex items-center justify-center overflow-hidden bg-background pt-28 pb-12"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-accent-blue/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="relative h-[480px] w-full max-w-7xl mx-auto flex items-center justify-center px-6">
        {slides.map((slide, index) => {
          const { x, scale, zIndex, opacity } = getSlideStyle(index);
          const isActive = index === currentIndex;

          return (
            <motion.div
              key={slide.id}
              initial={false}
              animate={{
                x,
                scale,
                zIndex,
                opacity,
              }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 22,
                mass: 1,
              }}
              className={`absolute w-[92%] h-[92%] md:w-[80%] md:h-[95%] rounded-[32px] overflow-hidden shadow-2xl bg-white cursor-pointer flex flex-col justify-end p-8 md:p-16 group select-none ${
                isActive ? "border border-slate-200" : "border border-transparent"
              }`}
              onClick={() => {
                if (!isActive) setCurrentIndex(index);
              }}
            >
              {/* Slide Media */}
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <img
                  src={slide.image}
                  className="w-full h-full object-cover brightness-100 transition-transform duration-[2000ms] group-hover:scale-105"
                  alt={`Slide ${slide.id}`}
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          );
        })}

        {/* Navigation Arrows */}
        <div className="absolute inset-x-4 md:inset-x-12 top-1/2 -translate-y-1/2 flex justify-between z-30 pointer-events-none">
          <button 
            onClick={() => paginate(-1)}
            className="pointer-events-auto p-3 rounded-full bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 shadow-md transition-all duration-200 cursor-pointer"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => paginate(1)}
            className="pointer-events-auto p-3 rounded-full bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 shadow-md transition-all duration-200 cursor-pointer"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-30">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                i === currentIndex 
                  ? "w-8 bg-accent-blue" 
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
