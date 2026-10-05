import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Clock, Truck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider, useCart } from "@/context/cart";
import { getCategories, getProducts, type OrderInput } from "@/lib/api";
import type { Category, Product } from "@/data/products";
import { BUSINESS } from "@/lib/format";
import { Hero } from "@/components/shop/Hero";
import { CategoryTabs } from "@/components/shop/CategoryTabs";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductOptionsDialog } from "@/components/shop/ProductOptionsDialog";
import { CartSheet } from "@/components/shop/CartSheet";
import { CheckoutDialog } from "@/components/shop/CheckoutDialog";
import { SuccessScreen } from "@/components/shop/SuccessScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Henry Clarke · Sabores que abrazan el alma" },
      { name: "description", content: "Almuerzos caseros, frutos secos y dulces. Haz tu pedido en línea con retiro o despacho." },
      { property: "og:title", content: "Henry Clarke · Sabores que abrazan el alma" },
      { property: "og:description", content: "Almuerzos caseros, frutos secos y dulces. Pide en línea." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <CartProvider>
      <Shop />
      <Toaster position="top-center" />
    </CartProvider>
  ),
});

function Shop() {
  const cart = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState("almuerzos");
  const [optionsFor, setOptionsFor] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [done, setDone] = useState<OrderInput | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
    getProducts().then(setProducts);
  }, []);

  const add = (p: Product, options: Record<string, string> = {}) => {
    cart.add(p, options);
    toast.success(`${p.name} añadido al carrito`);
  };

  const activeCat = categories.find((c) => c.id === active);
  const visible = products.filter((p) => p.categoryId === active);

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <main id="menu" className="scroll-mt-0">
        <CategoryTabs categories={categories} active={active} onChange={setActive} />
        <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="cat-title">
          <h2 id="cat-title" className="mb-6 font-display text-3xl font-bold text-primary sm:text-4xl">
            {activeCat?.name}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={(prod) => (prod.optionGroups?.length ? setOptionsFor(prod) : add(prod))} />
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 pb-28 sm:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-bold">Henry Clarke</p>
            <p className="font-display italic text-primary-foreground/80">Sabores que abrazan el alma</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex gap-2"><Clock className="size-4 shrink-0" aria-hidden /> Horario de pedidos: {BUSINESS.horario}</p>
            <p className="flex gap-2"><Truck className="size-4 shrink-0" aria-hidden /> Despacho: {BUSINESS.despacho}</p>
          </div>
          <p className="flex gap-2 text-sm text-primary-foreground/80">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Nuestros productos pueden contener trazas de frutos secos, gluten o lácteos.
          </p>
        </div>
      </footer>

      <button
        onClick={() => setCartOpen(true)}
        aria-label={`Abrir carrito, ${cart.count} productos`}
        className="fixed bottom-5 right-5 z-40 flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ShoppingBag className="size-7" />
        {cart.count > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground ring-2 ring-background">
            {cart.count}
          </span>
        )}
      </button>

      <ProductOptionsDialog
        product={optionsFor}
        onClose={() => setOptionsFor(null)}
        onConfirm={(p, o) => {
          add(p, o);
          setOptionsFor(null);
        }}
      />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} onSuccess={(o) => { setCheckoutOpen(false); setDone(o); }} />
      <SuccessScreen order={done} onClose={() => setDone(null)} />
    </div>
  );
}
