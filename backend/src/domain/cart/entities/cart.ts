/**
 * Represents a shopping cart stored in Redis.
 *
 * **Properties:**
 * - `items` — list of CartItem entries (productId, quantity, name, price, imageUrl)
 * - `total` — computed total price across all items
 *
 * Cart data lives in Redis hashes (`cart:{userId}`), not PostgreSQL.
 * Cart operations modify Redis directly and return the full Cart object.
 */
export interface Cart {
  items: CartItem[];
  total: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl: string | null;
}
