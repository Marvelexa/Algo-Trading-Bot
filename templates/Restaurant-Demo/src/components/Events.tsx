import { motion } from 'motion/react';
import { Calendar, Users, Music, Wine, ArrowRight } from 'lucide-react';
import { EVENTS } from '../constants';

export default function EventsAndPrivateDining() {
  const getPhotosFromParams = (): string[] => {
    try {
      const raw = new URLSearchParams(window.location.search).get('photos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };
  const mapsPhotos = getPhotosFromParams();
  const storefrontPhoto = mapsPhotos[0];

  return (
    <section className="bg-brand-cream py-32 px-4 md:px-12 relative overflow-hidden">
      <div className="max-w-[1700px] mx-auto relative z-10">
        {/* Events */}
        <div id="events" className="mb-40">
          <div className="text-center mb-24">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-brand-orange text-sm font-black uppercase tracking-[0.5em] block mb-4"
            >
              Our Events
            </motion.span>
            <h2 className="text-5xl md:text-7xl font-serif font-black text-brand-brown mb-8 italic leading-tight">Special Events</h2>
            <div className="w-32 h-1.5 bg-brand-red mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
            {EVENTS.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.8 }}
                className="group relative h-[600px] rounded-[4rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(45,27,20,0.15)]"
              >
                <img 
                  src={event.image} 
                  className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110" 
                  alt={event.title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-brown via-brand-brown/20 to-transparent" />
                <div className="absolute inset-0 p-10 flex flex-col justify-end transform transition-transform duration-500 group-hover:translate-y-[-10px]">
                  <div className="flex items-center space-x-3 text-brand-orange mb-4">
                    <Calendar className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">{event.date}</span>
                  </div>
                  <h3 className="text-white text-3xl font-serif mb-4 font-black italic">{event.title}</h3>
                  <p className="text-white/70 text-sm mb-8 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">{event.description}</p>
                  <button className="bg-brand-orange text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-red transition-all shadow-2xl">
                    LEARN MORE
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Private Dining */}
        <div id="private-dining" className="bg-white rounded-[5rem] p-12 md:p-32 overflow-hidden relative shadow-[0_60px_120px_-30px_rgba(45,27,20,0.15)] border border-brand-brown/5">
          <div className="absolute top-0 right-0 w-full h-full opacity-[0.02] pointer-events-none">
            <Wine className="w-full h-full rotate-12 scale-150 text-brand-brown" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 md:gap-32 items-center relative z-10">
            <div className="text-left order-2 lg:order-1">
              <span className="text-brand-red text-sm font-black uppercase tracking-[0.4em] block mb-6">Private Dining</span>
              <h2 className="text-5xl md:text-7xl font-serif font-black text-brand-brown mb-8 leading-[1.1]">Luxury <br /> <span className="text-brand-orange italic font-normal">Dining Rooms</span></h2>
              <p className="text-brand-brown/60 text-lg mb-12 font-medium leading-relaxed max-w-xl">
                Enjoy your celebrations in our beautiful private dining rooms. 
                We offer a private space and personalized service for your special moments.
              </p>
              
              <div className="grid grid-cols-2 gap-8 mb-16">
                <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-brand-brown/5 rounded-2xl flex items-center justify-center text-brand-red shadow-inner">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="text-brand-brown text-[10px] uppercase tracking-widest font-black">Intimacy for 30</h5>
                  </div>
                </div>
                <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-brand-brown/5 rounded-2xl flex items-center justify-center text-brand-orange shadow-inner">
                    <Wine className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="text-brand-brown text-[10px] uppercase tracking-widest font-black">Vintage Pairing</h5>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <button className="bg-brand-brown text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-red transition-all shadow-2xl">
                  Contact Us
                </button>
                <button className="text-brand-brown font-black uppercase tracking-widest text-[10px] border-b-2 border-brand-orange pb-1 hover:text-brand-red hover:border-brand-red transition-all">
                  View Our Rooms
                </button>
              </div>
            </div>

            <div className="relative order-1 lg:order-2">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(45,27,20,0.2)] relative z-20 border-[20px] border-brand-cream"
              >
                <img 
                  src={storefrontPhoto || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800'} 
                  className="w-full h-[600px] object-cover"
                  alt="Restaurant Front View"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800';
                  }}
                />
              </motion.div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-brand-red rounded-[3rem] p-8 text-white shadow-2xl hidden md:flex flex-col justify-between z-30">
                <Music className="w-10 h-10" />
                <span className="text-[10px] uppercase tracking-widest font-black leading-tight">Live Ambient Performance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
