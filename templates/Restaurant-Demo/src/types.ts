export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  isPopular?: boolean;
  isChefSpecial?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  image: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  description: string;
  image: string;
}
