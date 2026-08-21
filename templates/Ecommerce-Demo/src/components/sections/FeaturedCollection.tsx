"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";

interface CategoryCard {
  id: string;
  name: string;
  count: string;
  image: string;
  color: string;
}

const DEFAULT_CATEGORIES: CategoryCard[] = [
  {
    id: "Night Suit",
    name: "Cotton & Silk Night Suits",
    count: "12 Items",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
    color: "from-blue-600/20 to-transparent"
  },
  {
    id: "Palazzos",
    name: "Designer Pastel Palazzos",
    count: "8 Items",
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=600&auto=format&fit=crop",
    color: "from-amber-600/20 to-transparent"
  },
  {
    id: "T-Shirts",
    name: "Essential Street T-Shirts",
    count: "15 Items",
    image: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=600&auto=format&fit=crop",
    color: "from-zinc-600/20 to-transparent"
  },
  {
    id: "Kurtis",
    name: "Indian Style Kurtis",
    count: "10 Items",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop",
    color: "from-purple-600/20 to-transparent"
  }
];

export default function FeaturedCollection() {
  const { activeCategory, setActiveCategory } = useStore();
  const [categories, setCategories] = useState<CategoryCard[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawPhotos = searchParams.get('photos');

      if (rawPhotos) {
        const photos: string[] = JSON.parse(rawPhotos);
        if (Array.isArray(photos) && photos.length > 0) {
          const updated = DEFAULT_CATEGORIES.map((cat, idx) => ({
            ...cat,
            image: photos[idx % photos.length] || cat.image
          }));
          setCategories(updated);
        }
      }
    } catch {}
  }, []);

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id === activeCategory ? "All" : id);
    const grid = document.getElementById("catalog-grid");
    grid?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section 
      id="collection" 
      className="relative py-28 bg-[#f8fafc] overflow-hidden border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Section Header */}
        <div className="mb-16 text-center space-y-4 max-w-xl mx-auto">
          <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-accent-blue font-bold block">
            Curated Catalogue
          </span>
          <h2 className="font-serif font-bold text-4xl md:text-5xl uppercase tracking-tighter text-slate-800">
            Shop by Category.
          </h2>
          <p className="font-sans text-xs text-slate-500 leading-relaxed font-light">
            Filter our premium collection by selecting a category. Each item is crafted to prioritize absolute comfort and elegance.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`relative h-[280px] rounded-2xl overflow-hidden cursor-pointer bg-white border transition-all duration-500 group flex flex-col justify-end p-6 ${
                  isSelected 
                    ? "border-accent-blue scale-102 shadow-[0_10px_30px_rgba(37,99,235,0.08)]" 
                    : "border-slate-100 hover:border-slate-300 hover:scale-101"
                }`}
              >
                {/* Background image & gradient overlay */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <img
                    src={cat.image}
                    className="w-full h-full object-cover brightness-[0.4] group-hover:scale-105 transition-transform duration-700"
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} opacity-40`} />
                </div>

                {/* Details */}
                <div className="relative z-10 space-y-2 text-left">
                  <span className="font-sans text-[9px] uppercase tracking-widest text-white/80 font-semibold block">
                    {cat.count}
                  </span>
                  <h3 className="font-serif text-xl uppercase tracking-wide text-white group-hover:text-accent-blue transition-colors duration-300">
                    {cat.name}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
