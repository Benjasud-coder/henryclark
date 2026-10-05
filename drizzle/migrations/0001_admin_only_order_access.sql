DROP POLICY IF EXISTS "Staff read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff read order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff update order items" ON public.order_items;
CREATE POLICY "Admin read orders" ON public.orders FOR
SELECT TO authenticated USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );
CREATE POLICY "Admin update orders" ON public.orders FOR
UPDATE TO authenticated USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    ) WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );
CREATE POLICY "Admin read order items" ON public.order_items FOR
SELECT TO authenticated USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );