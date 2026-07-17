export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl: string | null;
}

export interface Cart {
  items: CartItem[];
  total: number;
}
