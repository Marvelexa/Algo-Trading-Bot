import { motion, AnimatePresence } from 'motion/react';
import { Coffee, ShoppingBag, Menu as MenuIcon, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar({ cartCount }: { cartCount: number }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Menu', href: '#menu' },
    { name: 'Reservations', href: '#reservations' },
    { name: 'Location', href: '#location' },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-6 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none"
    >
      <div className={`mx-auto max-w-5xl transition-all duration-300 pointer-events-auto rounded-full border border-white/20 shadow-lg backdrop-blur-md ${
        isScrolled ? 'bg-primary/95 py-2 px-6' : 'bg-primary/80 py-4 px-8'
      }`}>
        <div className="flex justify-between items-center gap-4">
          <a href="#home" className="flex items-center gap-2 group shrink-0">
            <Coffee className="w-6 h-6 sm:w-7 sm:h-7 text-accent group-hover:rotate-12 transition-transform" />
            <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-white">
              {new URLSearchParams(window.location.search).get('name') || "The Roastery"}
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="font-semibold transition-colors text-[10px] sm:text-xs uppercase tracking-widest text-white/80 hover:text-accent">
                {link.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="relative p-2 text-white hover:text-accent transition-colors">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-accent text-white text-[10px] flex items-center justify-center rounded-full border-2 border-primary"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button className="md:hidden p-2 text-white" aria-label="Toggle mobile menu" onClick={() => setMobileMenuOpen(true)}>
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-50 bg-secondary flex flex-col pt-20 px-6 shadow-2xl"
          >
            <button 
              className="absolute top-5 right-6 p-2 text-charcoal"
              aria-label="Close mobile menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-8 h-8" />
            </button>
            <div className="flex flex-col gap-8 items-center text-center mt-12">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-3xl font-serif text-primary hover:text-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <a 
                href="#menu" 
                className="mt-8 px-8 py-4 bg-primary text-secondary w-full max-w-sm text-center font-medium touch-manipulation hover:bg-primary/90 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Order Online
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
