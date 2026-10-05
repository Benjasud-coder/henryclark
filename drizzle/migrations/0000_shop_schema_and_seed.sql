CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  image_url text,
  available boolean NOT NULL DEFAULT true,
  option_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  delivery_type text CHECK (delivery_type IN ('retiro','despacho')),
  address text,
  commune text,
  notes text,
  payment_method text CHECK (payment_method IN ('efectivo','transferencia')),
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo','confirmado','entregado','cancelado'))
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  selected_options jsonb
);
CREATE INDEX ON public.products(category_id);
CREATE INDEX ON public.order_items(order_id);
CREATE INDEX ON public.orders(created_at DESC);

GRANT SELECT ON public.categories, public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.products TO authenticated;
GRANT SELECT, UPDATE ON public.orders, public.order_items TO authenticated;
GRANT ALL ON public.categories, public.products, public.orders, public.order_items TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update categories" ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff delete categories" ON public.categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Public read available products" ON public.products FOR SELECT TO anon USING (available = true);
CREATE POLICY "Staff read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff delete products" ON public.products FOR DELETE TO authenticated USING (true);

CREATE POLICY "Staff read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff read order items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff update order items" ON public.order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text,
  p_phone text,
  p_delivery_type text,
  p_address text,
  p_commune text,
  p_notes text,
  p_payment_method text,
  p_items jsonb
) RETURNS TABLE (order_id uuid, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_commune text := nullif(btrim(coalesce(p_commune, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_item jsonb;
  v_qty int;
  v_pid uuid;
  v_prod public.products%ROWTYPE;
  v_opts jsonb;
  v_group jsonb;
  v_choice text;
  v_total int := 0;
  v_order uuid;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN RAISE EXCEPTION 'Nombre inválido'; END IF;
  IF v_phone !~ '^\+56\s?9\s?\d{4}\s?\d{4}$' THEN RAISE EXCEPTION 'Teléfono inválido'; END IF;
  IF p_delivery_type IS NULL OR p_delivery_type NOT IN ('retiro','despacho') THEN RAISE EXCEPTION 'Tipo de entrega inválido'; END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('efectivo','transferencia') THEN RAISE EXCEPTION 'Método de pago inválido'; END IF;
  IF char_length(coalesce(v_address,'')) > 150 OR char_length(coalesce(v_commune,'')) > 60 OR char_length(coalesce(v_notes,'')) > 300 THEN
    RAISE EXCEPTION 'Texto demasiado largo';
  END IF;
  IF p_delivery_type = 'despacho' AND (v_address IS NULL OR v_commune IS NULL) THEN
    RAISE EXCEPTION 'Falta dirección o comuna';
  END IF;
  IF p_delivery_type = 'retiro' THEN v_address := NULL; v_commune := NULL; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Pedido sin productos';
  END IF;

  INSERT INTO public.orders (customer_name, phone, delivery_type, address, commune, notes, payment_method, total)
  VALUES (v_name, v_phone, p_delivery_type, v_address, v_commune, v_notes, p_payment_method, 0)
  RETURNING id INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_pid := (v_item->>'product_id')::uuid;
      v_qty := (v_item->>'quantity')::int;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Producto inválido';
    END;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 50 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;

    SELECT * INTO v_prod FROM public.products WHERE id = v_pid;
    IF NOT FOUND OR NOT v_prod.available THEN RAISE EXCEPTION 'Producto no disponible'; END IF;

    v_opts := coalesce(v_item->'selected_options', '{}'::jsonb);
    IF jsonb_typeof(v_opts) <> 'object' THEN RAISE EXCEPTION 'Opciones inválidas'; END IF;
    FOR v_group IN SELECT * FROM jsonb_array_elements(v_prod.option_groups) LOOP
      v_choice := v_opts->>(v_group->>'id');
      IF v_choice IS NULL THEN
        IF coalesce((v_group->>'required')::boolean, false) THEN RAISE EXCEPTION 'Falta elegir %', v_group->>'label'; END IF;
      ELSIF NOT (v_group->'choices') ? v_choice THEN
        RAISE EXCEPTION 'Opción inválida';
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_opts) k
               WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_prod.option_groups) g WHERE g->>'id' = k)) THEN
      RAISE EXCEPTION 'Opción inválida';
    END IF;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity, selected_options)
    VALUES (v_order, v_prod.id, v_prod.name, v_prod.price, v_qty, v_opts);
    v_total := v_total + v_prod.price * v_qty;
  END LOOP;

  UPDATE public.orders o SET total = v_total WHERE o.id = v_order;
  RETURN QUERY SELECT v_order, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(text,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(text,text,text,text,text,text,text,jsonb) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

CREATE POLICY "Staff read product images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Staff upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Staff update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Staff delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');

INSERT INTO public.categories (id, name, sort_order) VALUES
  ('b4d01606-f5a3-4d9a-bf3c-05bff5f4177d', 'Almuerzos', 1),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Frutos Secos Naturales', 2),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Frutos Secos Salados', 3),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Frutos Secos Dulces', 4),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Dulces y Otros', 5);

INSERT INTO public.products (category_id, name, description, price, available, option_groups, badge, sort_order) VALUES
  ('b4d01606-f5a3-4d9a-bf3c-05bff5f4177d', 'Promoción del día', 'Consomé + Plato de fondo + Ensalada + Postre + Pan y pebre', 8990, true, '[{"id":"proteina","label":"Proteína","required":true,"choices":["Pollo guisado","Pechuga apanada","Carne al jugo"]},{"id":"acompanamiento","label":"Acompañamiento","required":true,"choices":["Puré","Arroz"]}]'::jsonb, 'Promoción', 0),
  ('b4d01606-f5a3-4d9a-bf3c-05bff5f4177d', 'Consomé de pollo', 'Caldo casero', 2500, true, '[]'::jsonb, NULL, 1),
  ('b4d01606-f5a3-4d9a-bf3c-05bff5f4177d', 'Plato de fondo', 'Elige tu proteína y acompañamiento', 7500, true, '[{"id":"proteina","label":"Proteína","required":true,"choices":["Pollo guisado","Pechuga apanada","Carne al jugo"]},{"id":"acompanamiento","label":"Acompañamiento","required":true,"choices":["Puré","Arroz"]}]'::jsonb, NULL, 2),
  ('b4d01606-f5a3-4d9a-bf3c-05bff5f4177d', 'Palta reina', NULL, 7500, true, '[{"id":"relleno","label":"Relleno","required":true,"choices":["Pollo","Atún"]}]'::jsonb, NULL, 3),
  ('b4d01606-f5a3-4d9a-bf3c-05bff5f4177d', 'Bebida en lata', NULL, 1000, true, '[]'::jsonb, NULL, 4),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Mix natural 160g', NULL, 2500, true, '[]'::jsonb, NULL, 5),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Maní tostado 200g', NULL, 2500, true, '[]'::jsonb, NULL, 6),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Pasas 150g', NULL, 2500, true, '[]'::jsonb, NULL, 7),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Almendras 100g', NULL, 2500, true, '[]'::jsonb, NULL, 8),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Cranberries 150g', NULL, 2500, true, '[]'::jsonb, NULL, 9),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Nueces 100g', NULL, 2500, true, '[]'::jsonb, NULL, 10),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Semillas de zapallo 150g', NULL, 2500, true, '[]'::jsonb, NULL, 11),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Plátanos deshidratados 150g', NULL, 2500, true, '[]'::jsonb, NULL, 12),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Avellanas europeas 150g', NULL, 2500, true, '[]'::jsonb, NULL, 13),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Maravillas 150g', NULL, 2500, true, '[]'::jsonb, NULL, 14),
  ('eea09246-61eb-4ca4-9b8d-0273d4648b7f', 'Avellanas chilenas 70g', NULL, 4000, true, '[]'::jsonb, NULL, 15),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Mix salado 160g', NULL, 2500, true, '[]'::jsonb, NULL, 16),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Maní salado 200g', NULL, 2500, true, '[]'::jsonb, NULL, 17),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Maní con merkén 200g', NULL, 2500, true, '[]'::jsonb, NULL, 18),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Maní japonés 150g', NULL, 2500, true, '[]'::jsonb, NULL, 19),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Maní japonés con pimentón 150g', NULL, 2500, true, '[]'::jsonb, NULL, 20),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Castañas de cajú 90g', NULL, 2500, true, '[]'::jsonb, NULL, 21),
  ('03d6bcfe-45f3-4caf-b6f8-b535decdf417', 'Pistachos 90g', NULL, 2500, true, '[]'::jsonb, NULL, 22),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Maní confitado tradicional con sésamo 200g', NULL, 2500, true, '[]'::jsonb, NULL, 23),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Maní confitado con frambuesa 200g', NULL, 2500, true, '[]'::jsonb, NULL, 24),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Maní confitado frutilla 200g', NULL, 2500, true, '[]'::jsonb, NULL, 25),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Maní confitado naranja 200g', NULL, 2500, true, '[]'::jsonb, NULL, 26),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Cholitos 150g', NULL, 2500, true, '[]'::jsonb, NULL, 27),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Almendras con chocolate 80g', NULL, 2500, true, '[]'::jsonb, NULL, 28),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Almendras confitadas 150g', NULL, 2500, true, '[]'::jsonb, NULL, 29),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Maravillas confitadas 150g', NULL, 2500, true, '[]'::jsonb, NULL, 30),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Guagüitas 170g', NULL, 2500, true, '[]'::jsonb, NULL, 31),
  ('e077bb70-e1f6-49e5-be5d-12b5e4e6d227', 'Gomitas 150g', NULL, 2500, true, '[]'::jsonb, NULL, 32),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Caja de cuchuflíes sin chocolate (28 un)', NULL, 7000, true, '[]'::jsonb, NULL, 33),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Caja de cuchuflíes con chocolate (18 un)', NULL, 7000, true, '[]'::jsonb, NULL, 34),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Caja de alfajores (8 un)', NULL, 7000, true, '[]'::jsonb, NULL, 35),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Aceitunas con rocoto ½ kg', NULL, 4000, true, '[]'::jsonb, NULL, 36),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Aceitunas tradicionales ½ kg', NULL, 4000, true, '[]'::jsonb, NULL, 37),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Huesillos 350g', NULL, 3500, true, '[]'::jsonb, NULL, 38),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Miel natural 500g', NULL, 4000, true, '[]'::jsonb, NULL, 39),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Frutillas 1 kg', NULL, 5000, true, '[]'::jsonb, NULL, 40),
  ('47ae08c3-9716-47be-9af7-fc76d6d39972', 'Uvas 1 kg', NULL, 5000, true, '[]'::jsonb, NULL, 41);