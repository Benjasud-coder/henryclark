import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Product } from "@/data/products";

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options: Record<string, string>;
}

type Action =
  | { type: "add"; product: Product; options: Record<string, string> }
  | { type: "inc"; key: string }
  | { type: "dec"; key: string }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "hydrate"; items: CartItem[] };

const STORAGE = "henry-clarke-cart";

const makeKey = (id: string, options: Record<string, string>) =>
  id + "|" + Object.keys(options).sort().map((k) => `${k}=${options[k]}`).join("&");

function reducer(state: CartItem[], a: Action): CartItem[] {
  switch (a.type) {
    case "add": {
      const key = makeKey(a.product.id, a.options);
      const found = state.find((i) => i.key === key);
      if (found) return state.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      return [
        ...state,
        { key, productId: a.product.id, name: a.product.name, price: a.product.price, quantity: 1, options: a.options },
      ];
    }
    case "inc":
      return state.map((i) => (i.key === a.key ? { ...i, quantity: i.quantity + 1 } : i));
    case "dec":
      return state.flatMap((i) =>
        i.key === a.key ? (i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : []) : [i],
      );
    case "remove":
      return state.filter((i) => i.key !== a.key);
    case "clear":
      return [];
    case "hydrate":
      return a.items;
  }
}

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, options?: Record<string, string>) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) dispatch({ type: "hydrate", items: JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.quantity * i.price, 0),
      add: (product, options = {}) => dispatch({ type: "add", product, options }),
      inc: (key) => dispatch({ type: "inc", key }),
      dec: (key) => dispatch({ type: "dec", key }),
      remove: (key) => dispatch({ type: "remove", key }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [items],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart debe usarse dentro de CartProvider");
  return c;
}

export const optionsText = (o: Record<string, string>) => Object.values(o).join(" · ");
