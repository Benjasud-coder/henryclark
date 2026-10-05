import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, optionsText } from "@/context/cart";
import { formatCLP } from "@/lib/format";
import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCheckout: () => void;
}

export function CartSheet({ open, onOpenChange, onCheckout }: Props) {
  const { items, total, inc, dec, remove } = useCart();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Tu pedido</SheetTitle>
          <SheetDescription>Revisa tus productos antes de finalizar.</SheetDescription>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBasket className="size-12 text-accent" aria-hidden />
            <p className="font-display text-lg">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground">Date un gusto: elige algo rico del menú y lo preparamos con cariño.</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-4">
              {items.map((i) => (
                <li key={i.key} className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium leading-snug">{i.name}</p>
                      {Object.keys(i.options).length > 0 && (
                        <p className="text-xs text-muted-foreground">{optionsText(i.options)}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Eliminar ${i.name}`} onClick={() => remove(i.key)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="size-8" aria-label="Restar uno" onClick={() => dec(i.key)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center font-semibold" aria-live="polite">{i.quantity}</span>
                      <Button variant="outline" size="icon" className="size-8" aria-label="Sumar uno" onClick={() => inc(i.key)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-primary">{formatCLP(i.price * i.quantity)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-4">
              <div className="mb-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCLP(total)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={onCheckout}>
                Finalizar pedido
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
