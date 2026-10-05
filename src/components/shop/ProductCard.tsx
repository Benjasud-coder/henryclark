import type { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format";
import { Plus, Wheat } from "lucide-react";

interface Props {
  product: Product;
  onAdd: (p: Product) => void;
}

export function ProductCard({ product, onAdd }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="relative aspect-[4/3] bg-placeholder">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Wheat className="size-10 text-accent/50" aria-hidden />
          </div>
        )}
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {product.badge}
          </span>
        )}
        {!product.available && (
          <span className="absolute right-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
            Agotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug">{product.name}</h3>
        {product.description && <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-lg font-bold text-primary">{formatCLP(product.price)}</span>
          <Button size="sm" disabled={!product.available} onClick={() => onAdd(product)}>
            {product.available ? (
              <>
                <Plus className="size-4" /> Añadir al carrito
              </>
            ) : (
              "Agotado"
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
