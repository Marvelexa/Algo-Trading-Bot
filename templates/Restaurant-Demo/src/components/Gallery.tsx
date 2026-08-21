import { motion } from 'motion/react';

const INTERIOR_IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800', // Restaurant Interior
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800', // Dining Hall
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800', // Table Setup
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800', // Patio & Entrance
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800', // Counter Bar
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800', // Fine Dining Ambiance
];

export default function Gallery() {
  const getPhotosFromParams = (): string[] => {
    try {
      const raw = new URLSearchParams(window.location.search).get('photos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };
  const mapsPhotos = getPhotosFromParams();
  // mapsPhotos[0] is the storefront/building facade photo
  const storefrontPhoto = mapsPhotos[0];

  return (
    <section id="gallery" className="bg-brand-cream py-32 px-4">
      <div className="max-w-[1700px] mx-auto">
        <div className="text-center mb-24">
          <span className="text-brand-orange text-sm uppercase tracking-[0.4em] font-black block mb-4">Photos</span>
          <h2 className="text-5xl md:text-7xl font-serif font-black text-brand-brown mb-6 italic leading-tight">Our Restaurant</h2>
          <div className="w-24 h-1.5 bg-brand-red mx-auto rounded-full" />
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
          {INTERIOR_IMAGES.map((src, idx) => {
            // First slot displays the real scraped storefront/building facade image
            const imageSrc = idx === 0 && storefrontPhoto ? storefrontPhoto : src;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="relative rounded-[3.5rem] overflow-hidden group border border-brand-brown/5 shadow-[0_30px_60px_-15px_rgba(45,27,20,0.1)]"
              >
                <img 
                  src={imageSrc} 
                  alt={`Restaurant Interior ${idx + 1}`} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src = src;
                  }}
                  className="w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-brand-brown/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="text-white text-[10px] font-black uppercase tracking-[0.5em] border-b-2 border-brand-red pb-1">View Larger</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
