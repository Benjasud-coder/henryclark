import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/admin-auth";
import { getOrders, orderStatusOptions, updateOrderStatus, type Order, type OrderStatus } from "@/lib/api";
import { formatCLP } from "@/lib/format";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<"checking" | "admin" | "denied">("checking");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    try {
      setOrders(await getOrders());
    } catch {
      toast.error("No pudimos cargar los pedidos. Revisa la conexión con Supabase.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const redirectToLogin = () => {
      if (!active) return;
      setAccess("denied");
      void navigate({ to: "/admin/login", replace: true });
    };

    async function verifyAdmin() {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !isAdminUser(data.user)) {
        if (data.user) await supabase.auth.signOut();
        redirectToLogin();
        return;
      }
      setAccess("admin");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && !isAdminUser(session.user))) {
        redirectToLogin();
      }
    });

    void verifyAdmin();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (access !== "admin") return;
    let active = true;
    setLoading(true);
    getOrders()
      .then((result) => { if (active) setOrders(result); })
      .catch(() => { if (active) toast.error("No pudimos cargar los pedidos. Revisa la conexión con Supabase."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [access]);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/admin/login", replace: true });
  }

  async function changeStatus(id: string, status: OrderStatus) {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
      toast.success("Estado actualizado");
    } catch {
      toast.error("No pudimos actualizar el estado.");
    } finally {
      setUpdating(null);
    }
  }

  const pendingCount = useMemo(() => orders.filter((order) => !["entregado", "cancelado"].includes(order.status)).length, [orders]);

  if (access !== "admin") {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Comprobando acceso…</main>;
  }

  return (
    <main className="min-h-screen bg-secondary/40 px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button asChild variant="ghost" className="mb-3 -ml-3"><a href="/"><ArrowLeft data-icon="inline-start" /> Volver al menú</a></Button>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Henry Clarke</p>
            <h1 className="font-display text-4xl font-bold text-primary">Revisión de pedidos</h1>
            <p className="mt-2 text-muted-foreground">{pendingCount} pedidos pendientes de atención</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
              <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : undefined} /> Actualizar
            </Button>
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut data-icon="inline-start" /> Cerrar sesión
            </Button>
          </div>
        </header>

        {loading ? <p className="py-12 text-center text-muted-foreground">Cargando pedidos…</p> : orders.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><ClipboardList className="size-10 text-muted-foreground" /><p className="font-semibold">Aún no hay pedidos</p><p className="text-sm text-muted-foreground">Los pedidos nuevos aparecerán aquí.</p></CardContent></Card>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => <OrderCard key={order.id} order={order} updating={updating === order.id} onStatusChange={changeStatus} />)}
          </div>
        )}
      </div>
    </main>
  );
}

function OrderCard({ order, updating, onStatusChange }: { order: Order; updating: boolean; onStatusChange: (id: string, status: OrderStatus) => void }) {
  const date = order.created_at ? new Date(order.created_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "Fecha no disponible";
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
      <div><CardTitle className="text-xl">{order.customer_name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{date} · {order.phone}</p></div>
      <Select value={order.status} onValueChange={(value) => onStatusChange(order.id, value as OrderStatus)} disabled={updating}>
        <SelectTrigger className="w-[170px]" aria-label={`Estado de ${order.customer_name}`}><SelectValue /></SelectTrigger>
        <SelectContent>{orderStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2"><Badge variant="secondary">{order.delivery_type === "despacho" ? `Despacho · ${order.commune ?? ""}` : "Retiro"}</Badge><Badge variant="outline">Pago: {order.payment_method}</Badge></div>
      <Separator />
      <ul className="flex flex-col gap-2 text-sm">{order.order_items.map((item) => <li key={item.id} className="flex justify-between gap-4"><span>{item.quantity} × {item.product_name}</span><span className="shrink-0 font-medium">{formatCLP(item.unit_price * item.quantity)}</span></li>)}</ul>
      {order.address && <p className="text-sm"><span className="font-semibold">Dirección:</span> {order.address}</p>}
      {order.notes && <p className="rounded-lg bg-secondary p-3 text-sm"><span className="font-semibold">Nota:</span> {order.notes}</p>}
      <div className="flex justify-end border-t pt-3 text-lg font-bold">Total: {formatCLP(order.total)}</div>
    </CardContent>
  </Card>;
}

export default OrdersPage;
