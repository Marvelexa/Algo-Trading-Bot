"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, PRODUCTS, Product } from "@/store/useStore";
import { FiShoppingCart, FiHeart, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function BestSellers() {
  const { cart, addToCart } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState<Record<string, boolean>>({});

  const getSearchParam = (key: string): string => {
    try {
      if (typeof window !== "undefined") {
        return new URLSearchParams(window.location.search).get(key) || "";
      }
    } catch {}
    return "";
  };

  const nameParam = getSearchParam("name").toLowerCase();
  const categoryParam = getSearchParam("category").toLowerCase();
  const fullText = `${nameParam} ${categoryParam}`;

  const getPhotosFromParams = (): string[] => {
    try {
      const raw = getSearchParam("photos");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };

  const mapsPhotos = getPhotosFromParams();
  const productPhotos = mapsPhotos.slice(1);

  // Dynamic Catalog Generator for Retail / Ecommerce
  const getDynamicProducts = (): Product[] => {
    const isJewelry = fullText.includes("jewel") || fullText.includes("gold") || fullText.includes("silver") || fullText.includes("diamond");
    const isFootwear = fullText.includes("shoe") || fullText.includes("footwear") || fullText.includes("sneaker") || fullText.includes("jutti");
    const isElectronics = fullText.includes("mobile") || fullText.includes("electronic") || fullText.includes("phone") || fullText.includes("gadget");

    let base: Product[] = PRODUCTS;

    if (isJewelry) {
      base = [
        { id: "j1", name: "24K Gold Plated Kundan Necklace", price: 2499, category: "Jewelry", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=crop", description: "Handcrafted traditional Kundan necklace set with matching earrings.", sizes: ["Free Size"] },
        { id: "j2", name: "Handcrafted Chandelier Earrings", price: 999, category: "Jewelry", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop", description: "Intricate pearl and gemstone chandelier drop earrings.", sizes: ["Free Size"] },
        { id: "j3", name: "Classic Pearl & Diamond Bracelet", price: 1799, category: "Jewelry", image: "https://images.unsplash.com/photo-1611591475179-7a54a7f05256?q=80&w=600&auto=format&fit=crop", description: "Elegant sterling silver bracelet with fresh water pearls.", sizes: ["Adjustable"] }
      ];
    } else if (isFootwear) {
      base = [
        { id: "f1", name: "Handcrafted Traditional Juttis", price: 1299, category: "Footwear", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop", description: "Premium embroidered leather juttis for festive occasions.", sizes: ["6", "7", "8", "9", "10"] },
        { id: "f2", name: "Italian Leather Dress Shoes", price: 3999, category: "Footwear", image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=600&auto=format&fit=crop", description: "Formal handcrafted oxford leather dress shoes.", sizes: ["7", "8", "9", "10"] },
        { id: "f3", name: "Lightweight Cushion Sneakers", price: 2499, category: "Footwear", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop", description: "Breathable mesh running sneakers with responsive foam sole.", sizes: ["7", "8", "9", "10", "11"] }
      ];
    } else if (isElectronics) {
      base = [
        { id: "e1", name: "Wireless Active Noise Canceling Earbuds", price: 2999, category: "Electronics", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=600&auto=format&fit=crop", description: "High fidelity Bluetooth 5.3 earbuds with 30-hour battery life.", sizes: ["Standard"] },
        { id: "e2", name: "Smart Fitness Watch Ultra", price: 3499, category: "Electronics", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop", description: "AMOLED HD display smartwatch with heart rate & SpO2 monitoring.", sizes: ["Standard"] }
      ];
    } else {
      // Default Apparel / Clothing Store
      base = [
        { id: "c1", name: "Designer Embroidered Silk Kurti", price: 1499, category: "Ethnic Wear", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop", description: "Pure silk kurti featuring intricate hand embroidery.", sizes: ["S", "M", "L", "XL"] },
        { id: "c2", name: "Pastel Cotton Palazzo & Dupatta Set", price: 1899, category: "Ethnic Wear", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600&auto=format&fit=crop", description: "Breathable cotton flared palazzo suit set with chiffon dupatta.", sizes: ["S", "M", "L", "XL"] },
        { id: "c3", name: "Handwoven Banarasi Silk Saree", price: 3499, category: "Ethnic Wear", image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600&auto=format&fit=crop", description: "Traditional Banarasi woven silk saree with rich zari border.", sizes: ["Free Size"] },
        { id: "c4", name: "Oversized Heavyweight Cotton Hoodie", price: 1299, category: "Streetwear", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop", description: "400 GSM French terry cotton hoodie in relaxed dropped shoulder fit.", sizes: ["S", "M", "L", "XL"] }
      ];
    }

    return base.map((item, idx) => ({
      ...item,
      image: (productPhotos.length > 0 && productPhotos[idx % productPhotos.length]) || item.image
    }));
  };

  const activeProducts = getDynamicProducts();

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeProducts.length) % activeProducts.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeProducts.length);
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlisted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    // Default to 'M' size for quick buy
    addToCart(product, "M");
  };

  const getCardStyle = (index: number) => {
    let diff = index - currentIndex;
    const total = activeProducts.length;
    
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const isActive = diff === 0;
    let x = 0;
    let scale = 0.9;
    let opacity = 0.55;
    let zIndex = 10 - Math.abs(diff);
    let rotate = 0;

    if (isActive) {
      x = 0;
      scale = 1.02;
      opacity = 1;
      rotate = 0;
    } else if (diff === 1 || (diff < 0 && Math.abs(diff) === total - 1)) {
      x = 220;
      scale = 0.88;
      opacity = 0.6;
      rotate = 6;
    } else if (diff === -1 || (diff > 0 && Math.abs(diff) === total - 1)) {
      x = -220;
      scale = 0.88;
      opacity = 0.6;
      rotate = -6;
    } else {
      x = diff > 0 ? 340 : -340;
      scale = 0.7;
      opacity = 0;
    }

    return { x, scale, opacity, zIndex, rotate, isActive };
  };

  return (
    <section 
      id="catalog-grid" 
      className="py-24 bg-[#FAF9F6] relative overflow-hidden flex flex-col items-center justify-center text-center"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 w-full">
        
        {/* Header */}
        <div className="mb-12 space-y-3 max-w-xl mx-auto">
          <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-accent-blue font-bold block">
            Featured Selection
          </span>
          <h2 className="font-serif font-bold text-4xl md:text-5xl uppercase tracking-tighter text-slate-800">
            Best Sellers.
          </h2>
          <p className="font-sans text-xs text-slate-500 leading-relaxed font-light">
            Explore our top picks tailored for exceptional quality and comfort.
          </p>
        </div>

        {/* Carousel Outer Container */}
        <div className="relative w-full flex items-center justify-center min-h-[520px]">
          
          <button 
            onClick={handlePrev}
            className="absolute left-0 md:left-4 z-30 p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 shadow-lg transition-all duration-200 cursor-pointer pointer-events-auto"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleNext}
            className="absolute right-0 md:right-4 z-30 p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 shadow-lg transition-all duration-200 cursor-pointer pointer-events-auto"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>

          {/* Slider Cards Wrap */}
          <div className="relative w-full max-w-[340px] h-[500px] flex items-center justify-center">
            {activeProducts.map((prod, index) => {
              const { x, scale, opacity, zIndex, rotate, isActive } = getCardStyle(index);
              const isFav = wishlisted[prod.id];

              return (
                <motion.div
                  key={prod.id}
                  initial={false}
                  animate={{
                    x,
                    scale,
                    opacity,
                    zIndex,
                    rotate,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 20,
                  }}
                  className={`absolute w-full h-full bg-white rounded-3xl overflow-hidden flex flex-col justify-between p-4 shadow-xl select-none transition-all duration-300 ${
                    isActive 
                      ? "border-2 border-accent-blue pointer-events-auto" 
                      : "border border-slate-200/60 pointer-events-none"
                  }`}
                  onClick={() => {
                    if (!isActive) setCurrentIndex(index);
                  }}
                >
                  {/* Card Media Section with light gray backing */}
                  <div className="w-full h-[250px] bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-4 relative flex-shrink-0">
                    <img 
                      src={prod.image}
                      className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Card Content info */}
                  <div className="flex-1 flex flex-col justify-between pt-4 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] text-accent-blue font-bold uppercase tracking-wider">
                        {prod.category}
                      </span>
                      <h3 className="text-slate-800 font-extrabold text-sm uppercase tracking-wide line-clamp-1">
                        {prod.name}
                      </h3>
                      <div className="text-lg font-black text-slate-800 pt-1">
                        ₹{prod.price}
                      </div>
                    </div>

                    {/* Divider & Taxes */}
                    <div className="border-t border-slate-200/70 pt-3">
                      <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Inclusive of all taxes
                      </span>
                    </div>

                    {/* Button Row */}
                    <div className="flex gap-2.5 pt-3">
                      <button
                        onClick={(e) => handleAdd(prod, e)}
                        disabled={!isActive}
                        className="flex-1 bg-accent-blue hover:bg-blue-700 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 active:scale-95 disabled:opacity-50 transition-all duration-200"
                      >
                        <FiShoppingCart className="w-3.5 h-3.5" /> ADD TO CART
                      </button>

                      <button
                        onClick={(e) => toggleWishlist(prod.id, e)}
                        disabled={!isActive}
                        className={`w-11 h-11 border rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-200 ${
                          isFav 
                            ? "bg-red-500/10 border-red-500 text-red-500" 
                            : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <FiHeart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
