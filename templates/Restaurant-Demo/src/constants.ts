import { MenuItem, Category, Review, Event } from './types';

export const CATEGORIES: Category[] = [
  { id: 'all', name: 'All', icon: 'Utensils' },
  { id: 'starters', name: 'Starters', icon: 'Soup' },
  { id: 'main', name: 'Main Course', icon: 'Beef' },
  { id: 'desserts', name: 'Desserts', icon: 'IceCream' },
  { id: 'drinks', name: 'Drinks', icon: 'GlassWater' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Wagyu Ribeye',
    description: 'A5 Grade Wagyu beef served with truffle mashed potatoes and glazed carrots.',
    price: '$85',
    category: 'main',
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=800',
    isPopular: true,
    isChefSpecial: true,
  },
  {
    id: '2',
    name: 'Truffle Lobster Risotto',
    description: 'Creamy Arborio rice with fresh lobster chunks and black truffle shavings.',
    price: '$65',
    category: 'main',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=800',
    isPopular: true,
  },
  {
    id: '3',
    name: 'Burrata & Heirloom Tomato',
    description: 'Fresh burrata cheese, heirloom tomatoes, balsamic glaze, and basil oil.',
    price: '$22',
    category: 'starters',
    image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '4',
    name: 'Gold Leaf Chocolate Dome',
    description: 'Dark chocolate dome with gold leaf, raspberry coulis, and hazelnut praline.',
    price: '$18',
    category: 'desserts',
    image: 'https://images.unsplash.com/photo-1509482560494-4126f8225994?auto=format&fit=crop&q=80&w=800',
    isChefSpecial: true,
  },
  {
    id: '5',
    name: 'Octopus Carpaccio',
    description: 'Thinly sliced Mediterranean octopus, lemon zest, capers, and extra virgin olive oil.',
    price: '$28',
    category: 'starters',
    image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '6',
    name: 'Smoked Old Fashioned',
    description: 'Premium bourbon, maple syrup, bitters, smoked with hickory wood.',
    price: '$20',
    category: 'drinks',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '7',
    name: 'Atlantic Salmon',
    description: 'Pan-seared salmon with lemon butter sauce and seasonal asparagus.',
    price: '$42',
    category: 'main',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '8',
    name: 'Duck Confit',
    description: 'Slow-cooked duck leg with cherry reduction and parsnip puree.',
    price: '$48',
    category: 'main',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
  }
];

export const REVIEWS: Review[] = [
  {
    id: '1',
    name: 'Alexander Thompson',
    rating: 5,
    comment: 'An unforgettable dining experience. The Wagyu Ribeye was cooked to perfection.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: '2',
    name: 'Isabella Rodriguez',
    rating: 5,
    comment: 'The atmosphere is incredible. Perfect for a special occasion. Highly recommend.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
  }
];

export const EVENTS: Event[] = [
  {
    id: '1',
    title: 'Wine Tasting Night',
    date: 'July 15, 2026',
    description: 'Explore a selection of rare vintage wines from the Bordeaux region.',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    title: 'Jazz & Dine',
    date: 'Every Friday',
    description: 'Live jazz performance accompanied by a special 5-course tasting menu.',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=800',
  }
];
