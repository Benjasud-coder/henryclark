import { categories, products, type Category, type Product } from "@/data/products";
import type { CartItem } from "@/context/cart";
import { supabase } from "@/integrations/supabase/client";

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

export type OrderStatus = "pendiente" | "confirmado" | "en preparación" | "listo" | "entregado" | "cancelado";

export async function getCategories(): Promise<Category[]> {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function submitOrder(order: OrderInput): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("create_order", {
    p_address: order.address ?? "",
    p_commune: order.comuna ?? "",
    p_customer_name: order.name,
    p_delivery_type: order.deliveryType,
    p_items: order.items.map((item) => ({
      product_id: item.productId,   // ← fix: CartItem usa `productId`, no `id`
      product_name: item.name,
      quantity: item.quantity,
      selected_options: item.options,
      unit_price: item.price,
    })),
    p_notes: order.notes ?? "",
    p_payment_method: order.paymentMethod,
    p_phone: order.phone,
  });

  if (error) {
    console.error("[submitOrder] Supabase RPC error:", {
      message: error.message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    throw error;
  }
  if (!data?.[0]?.order_id) {
    console.error("[submitOrder] RPC devolvió respuesta vacía. data:", data);
    throw new Error("No se pudo crear el pedido: respuesta vacía del servidor.");
  }
  return { id: data[0].order_id };
}

export async function getOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_name, phone, delivery_type, address, commune, notes, payment_method, status, total, created_at, order_items(id, product_name, quantity, selected_options, unit_price)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export const orderStatuses: OrderStatus[] = ["pendiente", "confirmado", "en preparación", "listo", "entregado", "cancelado"];

export const localOrderData = { categories, products };
export type { CartItem };
export type Order = Awaited<ReturnType<typeof getOrders>>[number];
export type OrderItem = Order["order_items"][number];
export type { Category, Product };
export type { Json } from "@/integrations/supabase/types";
export const formatOrderStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);
export const isOrderStatus = (status: string): status is OrderStatus => orderStatuses.includes(status as OrderStatus);
export const safeOrderStatus = (status: string): OrderStatus => isOrderStatus(status) ? status : "pendiente";
export const orderStatusLabel = formatOrderStatus;
export const orderStatusValues = orderStatuses;
export const orderStatusForSelect = orderStatuses.map((value) => ({ value, label: formatOrderStatus(value) }));
export const getOrderStatus = safeOrderStatus;
export const getOrderStatusLabel = formatOrderStatus;
export const orderStatusOptions = orderStatusForSelect;
export const statusOptions = orderStatusForSelect;
export const orderStatusList = orderStatuses;
export const orderStatusLabels = Object.fromEntries(orderStatuses.map((status) => [status, formatOrderStatus(status)]));
export const orderStatusColor = (status: string) => status === "cancelado" ? "destructive" : status === "entregado" ? "secondary" : "default";
export const orderStatusTone = orderStatusColor;
