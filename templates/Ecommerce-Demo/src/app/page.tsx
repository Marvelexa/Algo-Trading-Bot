"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";


// Sections
import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import FeaturedCollection from "@/components/sections/FeaturedCollection";
import BestSellers from "@/components/sections/BestSellers";
import Newsletter from "@/components/sections/Newsletter";
import Footer from "@/components/sections/Footer";

// Overlays
import CartDrawer from "@/components/ui/CartDrawer";
import FloatingProductBar from "@/components/ui/FloatingProductBar";
import Preloader from "@/components/ui/Preloader";

export default function Home() {
  const [loading, setLoading] = useState(true);

  // Prevent scrolling while loading
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [loading]);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <Preloader onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <main className="relative min-h-screen w-full bg-background overflow-x-hidden selection:bg-accent-blue selection:text-white">
        {/* Top Navigation */}
        <Header />

        {/* Pages Frame Layout */}
        <Hero />
        <FeaturedCollection />
        <BestSellers />
        <Newsletter />
        <Footer />

        {/* Overlays / Drawer Slide-overs */}
        <CartDrawer />
        <FloatingProductBar />
      </main>
    </>
  );
}
