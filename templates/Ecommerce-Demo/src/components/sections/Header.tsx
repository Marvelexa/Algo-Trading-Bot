"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { FiShoppingBag, FiGlobe, FiMenu, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const { cart, toggleCart } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [businessName, setBusinessName] = useState("MARVELEXA");

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = new URLSearchParams(window.location.search).get("name");
      if (name) {
        setBusinessName(name.toUpperCase());
      }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "py-4 mx-4 md:mx-12 mt-4 rounded-full bg-slate-500/10 border border-slate-200/50 backdrop-blur-xl"
            : "py-6 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-1.5 select-none group">
            <span className="w-2 h-2 rounded-full bg-accent-blue group-hover:scale-125 transition-transform duration-300" />
            <span className="font-sans font-black tracking-[0.25em] text-sm uppercase text-slate-800">
              {businessName}
            </span>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-10">
            {["New Arrivals", "Night Suits", "Palazzos", "Streetwear"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="font-sans text-[10px] uppercase tracking-[0.2em] text-slate-600 hover:text-slate-900 transition-colors duration-300 relative py-1 group font-semibold"
              >
                {item}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent-blue group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors duration-300 cursor-pointer">
              <FiGlobe className="w-4 h-4" />
              <span className="font-sans text-[9px] uppercase tracking-widest font-bold">
                IN (₹)
              </span>
            </button>

            {/* Cart Icon */}
            <button
              onClick={toggleCart}
              className="relative p-2.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 hover:text-accent-blue transition-all duration-300 cursor-pointer border border-slate-200/50"
            >
              <FiShoppingBag className="w-4 h-4" />
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-blue text-[9px] font-bold text-white flex items-center justify-center border border-white shadow-lg"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-slate-500/10 transition-colors cursor-pointer text-slate-600 hover:text-slate-800"
            >
              {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 pt-28 pb-12 px-6 flex flex-col gap-6"
          >
            {["New Arrivals", "Night Suits", "Palazzos", "Streetwear"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMobileMenuOpen(false)}
                className="font-serif font-bold text-2xl uppercase tracking-widest text-slate-800 hover:text-accent-blue transition-colors"
              >
                {item}
              </a>
            ))}
            <div className="h-[1px] bg-slate-200 my-4" />
            <button className="flex items-center gap-2 text-slate-500">
              <FiGlobe className="w-4 h-4" />
              <span className="font-sans text-xs uppercase tracking-widest">
                Currency (INR ₹)
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
