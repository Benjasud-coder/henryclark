import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle } from "lucide-react";
import type { OrderInput } from "@/lib/api";
import { BUSINESS, formatCLP } from "@/lib/format";
import { optionsText } from "@/context/cart";

function buildMessage(o: OrderInput) {
  const lines = [
    `¡Hola Henry Clarke! Soy ${o.name} y acabo de hacer un pedido:`,
    "",
    ...o.items.map(
      (i) => `• ${i.quantity} × ${i.name}${Object.keys(i.options).length ? ` (${optionsText(i.options)})` : ""} — ${formatCLP(i.price * i.quantity)}`,
    ),
    "",
    `Total: ${formatCLP(o.total)}`,
    `Entrega: ${o.deliveryType === "despacho" ? "Despacho" : "Retiro"}`,
  ];
  if (o.deliveryType === "despacho") lines.push(`Dirección: ${o.address}, ${o.comuna}`);
  lines.push(`Pago: ${o.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}`);
  if (o.notes) lines.push(`Notas: ${o.notes}`);
  lines.push(`Teléfono: ${o.phone}`);
  return lines.join("\n");
}

export function SuccessScreen({ order, onClose }: { order: OrderInput | null; onClose: () => void }) {
  const href = order ? `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(buildMessage(order))}` : "#";
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <DialogTitle className="font-display text-3xl">¡Gracias, {order?.name.split(" ")[0]}!</DialogTitle>
        <DialogDescription className="text-base">
          Recibimos tu pedido y ya lo estamos preparando con cariño. Avísanos por WhatsApp para coordinar.
        </DialogDescription>
        <Button asChild variant="whatsapp" size="lg" className="mt-2 h-auto w-full whitespace-normal py-3">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-5" /> Avisar por WhatsApp al {BUSINESS.whatsappLabel}
          </a>
        </Button>
        <Button variant="ghost" onClick={onClose}>Volver al menú</Button>
      </DialogContent>
    </Dialog>
  );
}
