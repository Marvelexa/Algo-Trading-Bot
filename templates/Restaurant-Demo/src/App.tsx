import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MenuSection from './components/Menu';
import Gallery from './components/Gallery';
import EventsAndPrivateDining from './components/Events';
import Reservation from './components/Reservation';
import Reviews from './components/Reviews';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const [showLoading, setShowLoading] = useState(true);
  const businessName = new URLSearchParams(window.location.search).get('name') || "ÉTOILE";

  return (
    <main className="bg-black min-h-screen selection:bg-[#C5A059] selection:text-black">
      {showLoading && (
        <LoadingScreen 
          businessName={businessName} 
          onFinished={() => setShowLoading(false)} 
        />
      )}
      <Navbar />
      <Hero />
      <MenuSection />
      <Reviews />
      <Gallery />
      <EventsAndPrivateDining />
      <Reservation />
      <Footer />
    </main>
  );
}
