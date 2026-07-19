import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

// ── Shared types ──────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  isActive?: boolean;
  category?: { id?: string; name: string; slug?: string };
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
}

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

export interface OrderItem {
  productName: string;
  quantity: number;
  productPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: OrderItem[];
}

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Dashboard {
  revenue: number;
  totalOrders: number;
  dailyRevenue: number;
  bestSellers: { productId: string; score: number }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
}

// ── Query key factory ─────────────────────────────────────────

export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (params?: Record<string, string>) => ["products", "list", params] as const,
    detail: (id: string) => ["products", id] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  cart: {
    all: ["cart"] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: string) => ["orders", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  admin: {
    dashboard: ["admin", "dashboard"] as const,
    orders: ["admin", "orders"] as const,
    products: ["admin", "products"] as const,
    users: ["admin", "users"] as const,
  },
};

// ── Product hooks ─────────────────────────────────────────────

export function useProducts(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => api<PaginatedResponse<Product>>(`/products${qs}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

// ── Category hooks ────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api<{ data: Category[] }>("/categories"),
  });
}

// ── Cart hooks ────────────────────────────────────────────────

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: () => api<Cart>("/cart"),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      api("/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) }),
    onSuccess: () => {
      toast.success("Added to cart");
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
    onError: () => {
      toast.error("Failed to add to cart");
    },
  });
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (quantity <= 0) {
        return api<Cart>(`/cart/items/${productId}`, { method: "DELETE" });
      }
      return api<Cart>(`/cart/items/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart.all, data);
    },
    onError: (_err, variables) => {
      toast.error(variables.quantity <= 0 ? "Failed to remove item" : "Failed to update quantity");
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/cart", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.cart.all, { items: [], total: 0 });
      toast.success("Cart cleared");
    },
    onError: () => toast.error("Failed to clear cart"),
  });
}

// ── Order hooks ───────────────────────────────────────────────

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: () => api<{ data: Order[] }>("/orders"),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => api<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api(`/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }),
    onSuccess: (_data, orderId) => {
      toast.success("Order cancelled");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: () => toast.error("Failed to cancel order"),
  });
}

// ── Checkout hook ─────────────────────────────────────────────

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ id: string }>("/checkout", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

// ── Notification hooks ────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => api<{ data: Notification[] }>("/notifications"),
  });
}

// ── Auth hooks ────────────────────────────────────────────────

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: async (res) => {
      await fetch("/api/auth/set-cookie", {
        method: "POST",
        body: JSON.stringify({ token: res.accessToken }),
      });
      toast.success("Logged in successfully");
      queryClient.invalidateQueries();
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Login failed";
      toast.error(message);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
      api<{ accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    onSuccess: async (res) => {
      await fetch("/api/auth/set-cookie", {
        method: "POST",
        body: JSON.stringify({ token: res.accessToken }),
      });
      toast.success("Registered successfully");
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      toast.error(message);
    },
  });
}

// ── Admin hooks ───────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => api<Dashboard>("/admin/analytics"),
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: queryKeys.admin.orders,
    queryFn: () => api<{ data: Order[] }>("/admin/orders"),
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: queryKeys.admin.products,
    queryFn: () => api<{ data: Product[] }>("/products"),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => api<{ data: User[] }>("/admin/users"),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api(`/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    },
  });
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      product,
      isNew,
    }: {
      product: Record<string, unknown>;
      isNew: boolean;
    }) => {
      if (isNew) {
        return api("/products", { method: "POST", body: JSON.stringify(product) });
      }
      return api(`/products/${product.id}`, { method: "PATCH", body: JSON.stringify(product) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
