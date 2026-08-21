"use client";

import React, { useState, useEffect } from "react";
import { useStore, PRODUCTS, Product } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { FiShoppingCart, FiChevronUp } from "react-icons/fi";
import Button from "./Button";

export default function FloatingProductBar() {
  const { addToCart } = useStore();
  const [visible, setVisible] = useState(false);
  
  // Highlight the first featured product in the floating bar
  const product: Product = PRODUCTS[0];
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);

  useEffect(() => {
    const handleScroll = () => {
      // Show bar when user scrolls past 500px
      setVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAdd = () => {
    addToCart(product, selectedSize);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl rounded-full glassmorphism p-3 md:p-4 shadow-2xl flex items-center justify-between gap-4 border border-slate-200"
        >
          {/* Product Thumbnail & Details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
              <img
                src={product.image}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                alt={product.name}
              />
            </div>
            <div className="text-left hidden sm:block">
              <h4 className="font-sans font-bold text-[10px] text-primary-text uppercase tracking-wider line-clamp-1">
                {product.name}
              </h4>
              <p className="font-sans text-[10px] font-bold text-accent-gold mt-0.5">
                ₹{product.price}
              </p>
            </div>
          </div>

          {/* Sizing and Buy Actions */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Quick Size Select */}
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-[8px] uppercase tracking-widest text-secondary-text hidden md:inline">Size:</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[9px] font-sans font-bold text-slate-800 focus:outline-none focus:border-accent-blue cursor-pointer"
              >
                {product.sizes.map((sz) => (
                  <option key={sz} value={sz} className="bg-surface text-primary-text">
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Add CTA */}
            <Button
              onClick={handleAdd}
              className="bg-accent-blue text-white border-0 hover:brightness-110 flex items-center gap-1.5 py-2 px-5 text-[9px] font-extrabold uppercase tracking-widest rounded-full"
              glow
            >
              <FiShoppingCart className="w-3.5 h-3.5" /> ADD TO BAG
            </Button>
            
            {/* Scroll to Top helper */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-2 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer transition-all duration-300"
              title="Back to Top"
            >
              <FiChevronUp className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
