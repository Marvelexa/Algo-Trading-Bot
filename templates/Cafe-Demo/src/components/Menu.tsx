import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, Menu as MenuIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const MENU_ITEMS = [
  { 
    id: 1, 
    name: 'Artisanal Green Matcha', 
    calories: '190 Cal', 
    price: 4.50,
    description: "Cool down with our refreshing Artisanal Green Matcha Frappuccino, made from premium organic matcha perfectly blended with ice and milk.",
    image: "https://ik.imagekit.io/nwcatqsgu/51820b5b4bc4c7333fa9096b124c6480-Photoroom.png" 
  },
  { 
    id: 2, 
    name: 'Artisanal Brown Matcha', 
    calories: '280 Cal', 
    price: 5.50,
    description: 'Our Artisanal Brown Matcha perfectly blends rich chocolate and roasted matcha for a unique and refreshingly sweet profile.',
    image: "https://ik.imagekit.io/nwcatqsgu/ac4382d8-b915-4bb7-9702-3dcf083b1402-Photoroom.png"
  },
  { 
    id: 3, 
    name: 'Artisanal Pink Matcha', 
    calories: '250 Cal', 
    price: 5.75,
    description: 'A beautiful blend of fruity notes and earthy matcha, our Pink Matcha Frappuccino is both vibrant and delicious.',
    image: "https://ik.imagekit.io/nwcatqsgu/594848b5-c354-43e4-a433-d10c35d60a48-Photoroom.png"
  },
  { 
    id: 4, 
    name: 'Iced Mocha', 
    calories: '280 Cal', 
    price: 5.00,
    description: 'Made with sustainably sourced espresso beans, our refreshingly cool Iced Mocha is made with whole or nonfat milk, chocolate syrup, and topped with whipped topping.',
    image: "https://images.unsplash.com/photo-1557142046-c704a3adf364?auto=format&fit=crop&q=80&w=400&h=500"
  },
  {
    id: 5,
    name: 'Cold Brew',
    calories: '5 Cal',
    price: 4.00,
    description: 'Our signature slow-steeped cold brew. Refreshingly smooth and perfectly balanced.',
    image: "https://lifesimplified.gorenje.com/wp-content/uploads/2024/06/gorenje-blog-refreshing_cold_brew_coffee.jpg"
  },
  {
    id: 6,
    name: 'Matcha Lemonade',
    calories: '120 Cal',
    price: 4.75,
    description: 'Finely ground Teavana® matcha green tea combined with crisp lemonade then shaken with ice.',
    image: "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=400&h=500"
  },
  {
    id: 7,
    name: 'Velvet Vanilla Float',
    calories: '110 Cal',
    price: 4.50,
    description: 'Our slow-steeped custom blend of cold brew coffee accented with vanilla and topped with a delicate float of house-made velvet vanilla cream.',
    image: "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&q=80&w=400&h=500"
  },
  {
    id: 8,
    name: 'Nitro Cold Brew',
    calories: '5 Cal',
    price: 4.50,
    description: 'Our signature Cold Brew, infused with nitrogen to create a sweet flavor without sugar and cascading, velvety crema. Served bold and cold.',
    image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=400&h=500"
  },
  {
    id: 9,
    name: 'Iced Shaken Espresso',
    calories: '100 Cal',
    price: 4.25,
    description: 'Made with the rich, full-bodied espresso you love—then shaken, chilled and mellowed with sweetness and a touch of milk.',
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400&h=500"
  },
  {
    id: 10,
    name: 'Toffee Nut Latte',
    calories: '310 Cal',
    price: 5.25,
    description: 'A rich espresso combined with steamed milk and sweet, buttery toffee nut syrup, finished with a crown of whipped cream and crunchy toffee bits.',
    image: "https://twochimpscoffee.com/wp-content/uploads/2022/11/untitled06-768x616.jpg"
  }
];

export default function Menu({ onAddToCart }: { onAddToCart: (item: any) => void }) {
  // Read real business photos from Google Maps (passed via query params)
  const getPhotosFromParams = (): string[] => {
    try {
      const raw = new URLSearchParams(window.location.search).get('photos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };
  const mapsPhotos = getPhotosFromParams();
  const foodPhotos = mapsPhotos.slice(1);

  const getMenuItems = () => {
    return MENU_ITEMS.map((item, index) => ({
      ...item,
      image: (foodPhotos.length > 0 && foodPhotos[index % foodPhotos.length]) || item.image
    }));
  };
  const menuItems = getMenuItems();

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce hover to prevent chaotic scrolling when user just moves mouse across
  const handleMouseEnter = (index: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveIndex(index);
    }, 200); 
  };

  const handleMouseLeaveItem = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 200); 
  };

  return (
    <section id="menu" className="py-20 lg:py-28 bg-white relative overflow-hidden font-sans">
      {/* Background Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none z-0">
         <h2 className="text-[25vw] font-black text-charcoal/[0.02] whitespace-nowrap select-none tracking-tighter mix-blend-multiply flex items-center justify-center pt-20">
           Roastery
         </h2>
      </div>

      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 relative z-10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col justify-center">
        
        {/* Nav replica from image */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 pb-6 border-b border-charcoal/5 min-w-[800px]">
           <div className="flex items-center gap-10">
              <span className="font-serif text-3xl text-primary font-bold tracking-tight mr-4 italic">Roastery.</span>
              <span className="text-xs font-bold tracking-widest text-primary uppercase cursor-pointer">Our Menu</span>
              <span className="text-xs font-bold tracking-widest text-charcoal/40 uppercase hover:text-primary cursor-pointer transition-colors">Our Cafe</span>
           </div>
           
           <div className="flex items-center gap-10">
              <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-charcoal/40 uppercase hover:text-primary cursor-pointer transition-colors">
                Search <Search className="w-4 h-4 ml-1 opacity-50" />
              </span>
              <span className="hover:text-primary cursor-pointer transition-colors flex items-center gap-3 text-xs font-bold tracking-widest text-primary uppercase">
                My Basket <MenuIcon className="w-5 h-5 ml-1" />
              </span>
           </div>
        </div>
      </div>

      {/* Slider Container */}
      <div className="relative z-10 w-full flex flex-col justify-center min-h-[650px] pb-24">
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 xl:gap-8 pb-10 pt-10 w-full max-w-[1600px] mx-auto px-4 items-start"
        >
          {menuItems.map((item, index) => {
            const isActive = activeIndex === index;

            return (
              <div key={item.id} className={`relative w-full h-[410px] transition-all duration-300 ${isActive ? 'z-30' : 'z-10 hover:z-20'}`}>
                <motion.div
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeaveItem}
                  onClick={() => setActiveIndex(isActive ? null : index)}
                  className={`absolute top-0 left-0 w-full flex flex-col justify-start rounded-[2rem] cursor-pointer transition-shadow overflow-hidden origin-top
                    ${isActive ? 'shadow-2xl' : 'shadow-sm hover:shadow-md'}`}
                  animate={{
                    height: isActive ? 550 : 410,
                    scale: isActive ? 1.05 : 1,
                    backgroundColor: isActive ? '#DEAA88' : '#F6F5F2',
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                >
                  {/* Image Container */}
                  <motion.div 
                     className="relative w-full flex-shrink-0 flex items-center justify-center p-6 pb-2"
                     animate={{ height: isActive ? 220 : 200 }}
                     transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  >
                    <motion.div 
                       className={`w-full h-full rounded-2xl overflow-hidden ${item.image.includes('ik.imagekit.io') ? 'bg-white/40 shadow-inner mix-blend-multiply' : 'bg-charcoal/5'} p-2 relative flex items-center justify-center`}
                    >
                       <img 
                         src={item.image} 
                         alt={item.name}
                         referrerPolicy="no-referrer"
                         className={`max-h-full max-w-full ${!item.image.includes('ik.imagekit.io') ? 'object-cover w-full h-full' : 'object-contain'} rounded-xl drop-shadow-md`}
                       />
                    </motion.div>
                  </motion.div>

                  {/* Content Container */}
                  <div className="relative flex-1 flex flex-col h-full overflow-hidden w-full">
                    <AnimatePresence mode="popLayout" initial={false}>
                    {isActive ? (
                      <motion.div 
                        key="active"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="p-8 pb-8 flex flex-col flex-1 justify-between w-full"
                      >
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-8 text-center leading-tight drop-shadow-sm font-sans">
                              {item.name}
                            </h3>

                            <div className="space-y-4 mb-8 w-full max-w-[260px] mx-auto">
                              <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                                <span className="font-bold text-primary text-sm tracking-wide">Size</span>
                                <div className="flex items-center text-white font-medium cursor-pointer text-sm tracking-wide">
                                  Select a size <ChevronDown className="w-4 h-4 ml-1 text-primary" />
                                </div>
                              </div>
                              <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                                <span className="font-bold text-primary text-sm tracking-wide">Milk</span>
                                <div className="flex items-center text-white font-medium cursor-pointer text-sm tracking-wide">
                                  Select a milk type <ChevronDown className="w-4 h-4 ml-1 text-primary" />
                                </div>
                              </div>
                              <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                                <span className="font-bold text-primary text-sm tracking-wide">Drink</span>
                                <div className="flex items-center text-white font-medium cursor-pointer text-sm tracking-wide">
                                  Drink type <ChevronDown className="w-4 h-4 ml-1 text-primary" />
                                </div>
                              </div>
                            </div>
                        </div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
                          className="w-full max-w-[260px] mx-auto py-3.5 bg-white text-primary font-bold rounded-full hover:bg-white/90 transition-colors uppercase tracking-widest text-xs shadow-md touch-manipulation"
                        >
                          Add To Basket
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div 
                         key="inactive"
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         transition={{ duration: 0.2 }}
                         className="p-8 flex flex-col flex-1 text-center"
                      >
                        <h3 className="text-xl font-bold text-primary mb-6 font-sans">
                          {item.name}
                        </h3>
                        <div className="text-left w-full mt-auto">
                            <p className="text-xs font-bold text-charcoal/50 mb-3 uppercase tracking-widest">{item.calories}</p>
                            <p className="text-[13px] text-charcoal/60 leading-relaxed line-clamp-4">{item.description}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}
