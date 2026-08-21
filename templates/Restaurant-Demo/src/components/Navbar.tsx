import { motion } from 'motion/react';
import { Utensils, Menu as MenuIcon, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Menu', href: '#menu' },
    { name: 'Chef Specials', href: '#chef-specials' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Events', href: '#events' },
    { name: 'Reservation', href: '#reserve' },
  ];

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center py-4 md:py-8 pointer-events-none">
      <motion.nav 
        initial={false}
        animate={{
          width: scrolled ? "95%" : "100%",
          maxWidth: scrolled ? "1400px" : "1600px",
          backgroundColor: scrolled ? "rgba(250, 241, 228, 0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderRadius: scrolled ? "24px" : "0px",
          padding: scrolled ? "12px 32px" : "0px 48px",
          boxShadow: scrolled ? "0 25px 50px -12px rgba(45,27,20,0.15)" : "none",
          y: scrolled ? 10 : 0,
        }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center pointer-events-auto"
      >
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3 group cursor-pointer mr-20"
        >
          <div className="bg-brand-red p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-serif font-black tracking-widest text-brand-brown transition-colors">
            {new URLSearchParams(window.location.search).get('name') || "ÉTOILE"}
          </span>
        </motion.div>

        {/* Desktop Links - Grouped with Logo */}
        <div className="hidden lg:flex items-center space-x-10">
          {navLinks.map((link, idx) => (
            <motion.a
              key={link.name}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="relative text-[10px] uppercase tracking-[0.3em] font-black transition-colors group text-brand-brown/70 hover:text-brand-orange"
            >
              {link.name}
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-brand-orange transition-all duration-300 group-hover:w-full" />
            </motion.a>
          ))}
        </div>

        {/* Action Elements - Far Right */}
        <div className="ml-auto flex items-center space-x-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:block bg-brand-orange text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-red transition-all shadow-xl shadow-brand-orange/20"
          >
            ORDER NOW
          </motion.button>

          {/* Mobile Toggle */}
          <div className="lg:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all bg-brand-brown/5 border-brand-brown/10 text-brand-brown"
            >
              {isOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="lg:hidden absolute top-[calc(100%+16px)] left-0 w-full backdrop-blur-2xl rounded-3xl py-12 px-8 border shadow-2xl flex flex-col items-center space-y-8 bg-brand-cream/95 border-brand-brown/10"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm font-black uppercase tracking-[0.3em] transition-colors text-brand-brown/70 hover:text-brand-orange"
              >
                {link.name}
              </a>
            ))}
            <button className="w-full bg-brand-orange text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl">
              Book A Table
            </button>
          </motion.div>
        )}
      </motion.nav>
    </div>
  );
}
