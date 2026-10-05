import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format";

interface Props {
  product: Product | null;
  onClose: () => void;
  onConfirm: (p: Product, options: Record<string, string>) => void;
}

export function ProductOptionsDialog({ product, onClose, onConfirm }: Props) {
  const [sel, setSel] = useState<Record<string, string>>({});
  useEffect(() => setSel({}), [product]);

  const groups = product?.optionGroups ?? [];
  const valid = groups.every((g) => !g.required || sel[g.label]);

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{product?.name}</DialogTitle>
          <DialogDescription>{product && formatCLP(product.price)} · Elige tus opciones</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map((g) => (
            <fieldset key={g.id}>
              <legend className="mb-2 text-sm font-semibold">
                {g.label} {g.required && <span className="text-accent">(obligatorio)</span>}
              </legend>
              <RadioGroup value={sel[g.label] ?? ""} onValueChange={(v) => setSel((s) => ({ ...s, [g.label]: v }))}>
                {g.choices.map((c) => (
                  <Label
                    key={c}
                    htmlFor={`${g.id}-${c}`}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary"
                  >
                    <RadioGroupItem id={`${g.id}-${c}`} value={c} />
                    {c}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={!valid} onClick={() => product && onConfirm(product, sel)} className="w-full">
            Añadir al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
