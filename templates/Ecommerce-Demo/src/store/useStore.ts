import { create } from "zustand";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  sizes: string[];
  description: string;
}

export interface CartItem extends Omit<Product, "sizes"> {
  quantity: number;
  selectedSize: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "tee-white",
    name: "Baby Tee - White",
    price: 599,
    category: "Uncategorized",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
    description: "Premium cotton baby tee in clean optic white.",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "tee-pink",
    name: "Baby Tee - Light Baby Pink",
    price: 599,
    category: "Uncategorized",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop",
    description: "Classic comfortable fit baby tee in soft baby pink.",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "tee-lavender",
    name: "Baby Tee - Lavender",
    price: 599,
    category: "Uncategorized",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop",
    description: "Delightful custom knit baby tee in pastel lavender.",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "tee-navy",
    name: "Baby Tee - Navy Blue",
    price: 599,
    category: "Uncategorized",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=600&auto=format&fit=crop",
    description: "Everyday relaxed fit baby tee in deep navy blue.",
    sizes: ["S", "M", "L", "XL"]
  }
];

interface AppState {
  cart: CartItem[];
  isCartOpen: boolean;
  activeCategory: string;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, size: string) => void;
  removeFromCart: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  setActiveCategory: (category: string) => void;
  clearCart: () => void;
}

export const useStore = create<AppState>((set) => ({
  cart: [],
  isCartOpen: false,
  activeCategory: "All",
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  setCartOpen: (open) => set({ isCartOpen: open }),
  addToCart: (product, size) =>
    set((state) => {
      const existingItemIndex = state.cart.findIndex(
        (item) => item.id === product.id && item.selectedSize === size
      );
      if (existingItemIndex > -1) {
        const updatedCart = [...state.cart];
        updatedCart[existingItemIndex].quantity += 1;
        return { cart: updatedCart };
      }
      return { 
        cart: [...state.cart, { 
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          image: product.image,
          description: product.description,
          selectedSize: size,
          quantity: 1 
        }] 
      };
    }),
  removeFromCart: (id, size) =>
    set((state) => ({
      cart: state.cart.filter((item) => !(item.id === id && item.selectedSize === size)),
    })),
  updateQuantity: (id, size, quantity) =>
    set((state) => ({
      cart: state.cart
        .map((item) =>
          item.id === id && item.selectedSize === size
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        ),
    })),
  setActiveCategory: (category) => set({ activeCategory: category }),
  clearCart: () => set({ cart: [] }),
}));
