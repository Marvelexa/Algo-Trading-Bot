import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Menu from './components/Menu';
import Reservation from './components/Reservation';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(true);

  const businessName = new URLSearchParams(window.location.search).get('name') || "The Roastery";

  const addToCart = (item: any) => {
    setCartItems([...cartItems, item]);
    setLastAdded(item.name);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="w-full min-h-screen bg-secondary selection:bg-accent selection:text-white flex flex-col font-sans">
      {showLoading && (
        <LoadingScreen 
          businessName={businessName} 
          onFinished={() => setShowLoading(false)} 
        />
      )}
      <Navbar cartCount={cartItems.length} />
      <main className="flex-1">
        <Hero />
        <Menu onAddToCart={addToCart} />
        <Reservation />
      </main>
      <Footer />

      {/* Cart Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 bg-primary text-secondary px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border border-accent/20"
          >
            <div className="w-2 h-2 rounded-full bg-accent"></div>
            <div>
              <p className="font-medium text-sm sm:text-base">{lastAdded}</p>
              <p className="text-xs sm:text-sm auto opacity-80">Added to your order</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
