import { categories, products, type Category, type Product } from "@/data/products";
import type { CartItem } from "@/context/cart";

export interface OrderInput {
  name: string;
  phone: string;
  deliveryType: "retiro" | "despacho";
  address?: string | undefined;
  comuna?: string | undefined;
  notes?: string | undefined;
  paymentMethod: "efectivo" | "transferencia";
  items: CartItem[];
  total: number;
}

export async function getCategories(): Promise<Category[]> {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function submitOrder(order: OrderInput): Promise<{ id: string }> {
  // Por ahora local. Luego se reemplaza por Lovable Cloud sin tocar componentes.
  await new Promise((r) => setTimeout(r, 400));
  return { id: `HC-${Date.now().toString(36).toUpperCase()}`, ...{ _order: order } } as { id: string };
}
