import type { Category } from "../../categories/entities/category";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  categoryId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithCategory extends Product {
  category?: Category;
}

export function createProduct(props: {
  name: string; price: number; description?: string; stock?: number;
  categoryId?: string; imageUrl?: string;
}): Product {
  return {
    id: crypto.randomUUID(),
    name: props.name,
    slug: props.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    description: props.description ?? null,
    price: props.price,
    stock: props.stock ?? 0,
    categoryId: props.categoryId ?? null,
    imageUrl: props.imageUrl ?? null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function updateProduct(product: Product, props: {
  name?: string; price?: number; description?: string; stock?: number;
  categoryId?: string | null; imageUrl?: string | null; isActive?: boolean;
}): Product {
  return {
    ...product,
    ...(props.name !== undefined ? { name: props.name } : {}),
    ...(props.description !== undefined ? { description: props.description } : {}),
    ...(props.price !== undefined ? { price: props.price } : {}),
    ...(props.stock !== undefined ? { stock: props.stock } : {}),
    ...(props.categoryId !== undefined ? { categoryId: props.categoryId } : {}),
    ...(props.imageUrl !== undefined ? { imageUrl: props.imageUrl } : {}),
    ...(props.isActive !== undefined ? { isActive: props.isActive } : {}),
    ...(props.name !== undefined ? { slug: props.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } : {}),
    updatedAt: new Date(),
  };
}
