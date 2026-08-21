import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { CATEGORIES, MENU_ITEMS } from '../constants';
import * as Icons from 'lucide-react';
import { ShoppingCart, Star, Plus } from 'lucide-react';

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('all');

  const getSearchParam = (key: string): string => {
    try {
      return new URLSearchParams(window.location.search).get(key) || '';
    } catch {}
    return '';
  };

  const nameParam = getSearchParam('name').toLowerCase();
  const categoryParam = getSearchParam('category').toLowerCase();
  const fullText = `${nameParam} ${categoryParam}`;

  const getPhotosFromParams = (): string[] => {
    try {
      const raw = getSearchParam('photos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };
  const mapsPhotos = getPhotosFromParams();
  // Storefront cover photo is mapsPhotos[0]; real food/dish photos are mapsPhotos.slice(1)
  const foodPhotos = mapsPhotos.slice(1);

  // Dynamic Cuisine Dish Items based on Business Category & Name
  const getCuisineMenuItems = () => {
    const isIndian = fullText.includes('indian') || fullText.includes('desi') || fullText.includes('spice') || 
                     fullText.includes('curry') || fullText.includes('biryani') || fullText.includes('tikka') || 
                     fullText.includes('pakistani') || fullText.includes('masala') || fullText.includes('punjabi');
    
    const isArabic = fullText.includes('mandi') || fullText.includes('kabsa') || fullText.includes('arabic') || 
                     fullText.includes('grill') || fullText.includes('lebanese') || fullText.includes('shawarma') || 
                     fullText.includes('middle eastern') || fullText.includes('kebab');

    const isCafe = fullText.includes('cafe') || fullText.includes('coffee') || fullText.includes('bakery') || 
                   fullText.includes('patisserie') || fullText.includes('tea') || fullText.includes('matcha');

    if (isIndian) {
      return [
        { id: 1, name: 'Banarasi Dum Aloo', price: 12, category: 'mains', description: 'Slow-cooked baby potatoes in rich spiced tomato & yogurt gravy.', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800' },
        { id: 2, name: 'Palak Paneer Special', price: 14, category: 'mains', description: 'Fresh cottage cheese cubes in smooth spinach puree with garlic & butter.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=800' },
        { id: 3, name: 'Shahi Butter Chicken', price: 18, category: 'mains', description: 'Tender tandoori chicken pieces in velvety creamy tomato butter gravy.', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=800' },
        { id: 4, name: 'Paneer Butter Masala', price: 15, category: 'mains', description: 'Cottage cheese simmered with sweet onions, cashews and fragrant spices.', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=800' },
        { id: 5, name: 'Special Dum Biryani', price: 16, category: 'mains', description: 'Fragrant long-grain basmati rice layered with aromatic spices and saffron.', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800' },
        { id: 6, name: 'Garlic Butter Naan', price: 4, category: 'starters', description: 'Freshly baked clay oven naan topped with minced garlic & melted butter.', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=80&w=800' },
        { id: 7, name: 'Dal Makhani Supreme', price: 13, category: 'mains', description: 'Black lentils slow-cooked overnight with cream, butter and fresh coriander.', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800' },
        { id: 8, name: 'Samosa Chaat Platter', price: 10, category: 'starters', description: 'Crispy samosas crushed and layered with chickpea curry, chutneys & yogurt.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=800' }
      ];
    }

    if (isArabic) {
      return [
        { id: 1, name: 'Signature Chicken Mandi', price: 18, category: 'mains', description: 'Slow-cooked tender chicken served over fragrant long-grain mandi rice.', image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=80&w=800' },
        { id: 2, name: 'Special Lamb Kabsa', price: 22, category: 'mains', description: 'Succulent lamb shank braised with cardamom, cinnamon and Arabian spices.', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800' },
        { id: 3, name: 'Royal Mixed Grill Platter', price: 26, category: 'mains', description: 'Juicy lamb kebab, shish tawook and lamb chops served with garlic dip.', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800' },
        { id: 4, name: 'Hummus & Warm Pita', price: 9, category: 'starters', description: 'Smooth chickpea puree topped with extra virgin olive oil and paprika.', image: 'https://images.unsplash.com/photo-1577906096429-f73c2c312435?auto=format&fit=crop&q=80&w=800' },
        { id: 5, name: 'Mutabbal & Baba Ghanoush', price: 10, category: 'starters', description: 'Smokey eggplant dip blended with tahini and pomegranate seeds.', image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14da?auto=format&fit=crop&q=80&w=800' },
        { id: 6, name: 'Golden Cheese Kunafa', price: 12, category: 'desserts', description: 'Crispy shredded pastry baked with sweet cheese and orange blossom syrup.', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800' }
      ];
    }

    if (isCafe) {
      return [
        { id: 1, name: 'Artisanal Spanish Latte', price: 6, category: 'drinks', description: 'Rich espresso blended with condensed milk and steamed velvet milk.', image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=800' },
        { id: 2, name: 'Signature Cold Brew', price: 5, category: 'drinks', description: 'Slow-steeped custom coffee blend served over ice with subtle chocolate notes.', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=800' },
        { id: 3, name: 'Matcha Green Tea Latte', price: 6, category: 'drinks', description: 'Premium Japanese ceremonial matcha whisked with steamed oat milk.', image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=800' },
        { id: 4, name: 'Butter Croissant & Jam', price: 4, category: 'starters', description: 'Flaky golden croissant baked fresh daily, served with berry jam.', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800' }
      ];
    }

    return MENU_ITEMS;
  };

  const dynamicMenuItems = getCuisineMenuItems();

  const filteredItems = activeCategory === 'all' 
    ? dynamicMenuItems 
    : dynamicMenuItems.filter(item => item.category === activeCategory);

  return (
    <section id="menu" className="bg-brand-cream py-32 px-4 md:px-12 overflow-hidden">
      <div className="max-w-[1700px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-brand-red font-black uppercase tracking-[0.4em] text-xs mb-4 block"
            >
              Our Selection
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-serif font-black text-brand-brown leading-tight"
            >
              Delicious <br />
              <span className="text-brand-orange italic font-normal">Food Menu</span>
            </motion.h2>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="flex flex-wrap gap-2"
          >
            {CATEGORIES.map((cat) => {
              const Icon = (Icons as any)[cat.icon];
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                    isActive 
                      ? 'bg-brand-brown text-white shadow-xl shadow-brand-brown/20' 
                      : 'bg-white text-brand-brown/40 hover:bg-brand-red/10 hover:text-brand-red'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
                className="group relative bg-white rounded-[3rem] p-4 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(45,27,20,0.15)] transition-all duration-500 flex flex-col h-full"
              >
                {/* Image Container */}
                <div className="relative aspect-square rounded-[2.5rem] overflow-hidden mb-8">
                  <img 
                    src={(foodPhotos.length > 0 && foodPhotos[idx % foodPhotos.length]) || item.image} 
                    alt={item.name} 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = item.image;
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Overlay Badges */}
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                    {item.isChefSpecial && (
                      <span className="bg-brand-brown text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md">
                        Chef's Special
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-6 right-6">
                    <span className="bg-brand-cream/90 backdrop-blur-sm text-brand-brown text-lg font-black px-4 py-2 rounded-2xl shadow-xl flex items-center gap-1">
                      {item.price}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-2xl font-serif font-black text-brand-brown group-hover:text-brand-red transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-1 text-brand-orange mt-1">
                      <Star className="w-3 h-3 fill-brand-orange" />
                      <span className="text-[10px] font-black">4.9</span>
                    </div>
                  </div>
                  
                  <p className="text-brand-brown/50 text-sm font-medium leading-relaxed mb-8 flex-1 italic">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-brand-cream overflow-hidden">
                          <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-brand-orange flex items-center justify-center text-[8px] font-black text-white">
                        +12
                      </div>
                    </div>

                    <button className="bg-brand-brown text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-brand-red hover:scale-110 active:scale-90 transition-all shadow-lg group">
                      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>

                {/* Decorative Background Icon */}
                <Icons.Sparkles className="absolute top-1/2 right-4 w-20 h-20 text-brand-brown opacity-[0.02] -z-10 group-hover:opacity-[0.05] transition-opacity" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* View All Button */}
        <div className="mt-20 flex justify-center">
          <button className="bg-brand-orange text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-red hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-orange/20 flex items-center gap-4 group">
            Explore Full Menu 
            <ShoppingCart className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Decorative Floating Elements */}
      <div className="absolute top-40 -left-20 opacity-10 pointer-events-none rotate-12">
        <Icons.Beef className="w-64 h-64 text-brand-brown" />
      </div>
      <div className="absolute bottom-40 -right-20 opacity-10 pointer-events-none -rotate-12">
        <Icons.Utensils className="w-64 h-64 text-brand-brown" />
      </div>
    </section>
  );
}
