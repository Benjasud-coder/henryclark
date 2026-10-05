import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCart, optionsText } from "@/context/cart";
import { formatCLP } from "@/lib/format";
import { submitOrder, type OrderInput } from "@/lib/api";
import { toast } from "sonner";

const schema = z
  .object({
    name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+56\s?9\s?\d{4}\s?\d{4}$/, "Formato: +56 9 XXXXXXXX"),
    deliveryType: z.enum(["retiro", "despacho"]),
    address: z.string().trim().max(150).optional(),
    comuna: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(300).optional(),
    paymentMethod: z.enum(["efectivo", "transferencia"]),
  })
  .superRefine((d, ctx) => {
    if (d.deliveryType === "despacho") {
      if (!d.address) ctx.addIssue({ code: "custom", path: ["address"], message: "Ingresa la dirección" });
      if (!d.comuna) ctx.addIssue({ code: "custom", path: ["comuna"], message: "Ingresa la comuna" });
    }
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (order: OrderInput) => void;
}

function Choice({ value, label, id }: { value: string; label: string; id: string }) {
  return (
    <Label
      htmlFor={id}
      className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary"
    >
      <RadioGroupItem id={id} value={value} /> {label}
    </Label>
  );
}

export function CheckoutDialog({ open, onOpenChange, onSuccess }: Props) {
  const { items, total, clear } = useCart();
  const [sending, setSending] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "+56 9 ", deliveryType: "retiro", address: "", comuna: "", notes: "", paymentMethod: "efectivo" },
  });
  const delivery = form.watch("deliveryType");

  async function onSubmit(v: FormValues) {
    setSending(true);
    const order: OrderInput = { ...v, items, total };
    try {
      await submitOrder(order);
      clear();
      form.reset();
      onSuccess(order);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.error("[CheckoutDialog] Error al enviar pedido:", err);
      toast.error(`No pudimos enviar tu pedido: ${msg}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Finalizar pedido</DialogTitle>
          <DialogDescription>Completa tus datos y confirmamos tu pedido.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" autoComplete="tel" placeholder="+56 9 12345678" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deliveryType" render={({ field }) => (
              <FormItem><FormLabel>Tipo de entrega</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-2">
                    <Choice id="d-retiro" value="retiro" label="Retiro" />
                    <Choice id="d-despacho" value="despacho" label="Despacho" />
                  </RadioGroup>
                </FormControl><FormMessage /></FormItem>
            )} />
            {delivery === "despacho" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input autoComplete="street-address" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="comuna" render={({ field }) => (
                  <FormItem><FormLabel>Comuna</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            )}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notas del pedido (opcional)</FormLabel><FormControl><Textarea placeholder="Ej: sin cebolla" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem><FormLabel>Método de pago</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-2">
                    <Choice id="p-efectivo" value="efectivo" label="Efectivo" />
                    <Choice id="p-transferencia" value="transferencia" label="Transferencia" />
                  </RadioGroup>
                </FormControl><FormMessage /></FormItem>
            )} />

            <div className="rounded-2xl bg-secondary p-4">
              <p className="mb-2 text-sm font-semibold">Resumen</p>
              <ul className="space-y-1 text-sm">
                {items.map((i) => (
                  <li key={i.key} className="flex justify-between gap-2">
                    <span>{i.quantity} × {i.name}{Object.keys(i.options).length > 0 && <span className="text-muted-foreground"> ({optionsText(i.options)})</span>}</span>
                    <span className="shrink-0">{formatCLP(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-border pt-2 font-bold">
                <span>Total</span><span>{formatCLP(total)}</span>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={sending || items.length === 0}>
              {sending ? "Enviando…" : "Confirmar pedido"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
