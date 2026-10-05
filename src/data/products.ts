export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface OptionGroup {
  id: string;
  label: string;
  required: boolean;
  choices: string[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  optionGroups?: OptionGroup[];
  badge?: string;
}

export const categories: Category[] = [
  { id: "almuerzos", name: "Almuerzos", sortOrder: 1 },
  { id: "naturales", name: "Frutos Secos Naturales", sortOrder: 2 },
  { id: "salados", name: "Frutos Secos Salados", sortOrder: 3 },
  { id: "dulces", name: "Frutos Secos Dulces", sortOrder: 4 },
  { id: "otros", name: "Dulces y Otros", sortOrder: 5 },
];

const proteina: OptionGroup = {
  id: "proteina",
  label: "Proteína",
  required: true,
  choices: ["Pollo guisado", "Pechuga apanada", "Carne al jugo"],
};
const acompanamiento: OptionGroup = {
  id: "acompanamiento",
  label: "Acompañamiento",
  required: true,
  choices: ["Puré", "Arroz"],
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const simple = (categoryId: string, name: string, price = 2500): Product => ({
  id: `${categoryId}-${slug(name)}`,
  categoryId,
  name,
  price,
  available: true,
});

export const products: Product[] = [
  {
    id: "promocion",
    categoryId: "almuerzos",
    name: "Promoción del día",
    description: "Consomé + Plato de fondo + Ensalada + Postre + Pan y pebre",
    price: 8990,
    available: true,
    badge: "Promoción",
    optionGroups: [proteina, acompanamiento],
  },
  {
    id: "consome",
    categoryId: "almuerzos",
    name: "Consomé de pollo",
    description: "Caldo casero",
    price: 2500,
    available: true,
  },
  {
    id: "plato-fondo",
    categoryId: "almuerzos",
    name: "Plato de fondo",
    description: "Elige tu proteína y acompañamiento",
    price: 7500,
    available: true,
    optionGroups: [proteina, acompanamiento],
  },
  {
    id: "palta-reina",
    categoryId: "almuerzos",
    name: "Palta reina",
    price: 7500,
    available: true,
    optionGroups: [{ id: "relleno", label: "Relleno", required: true, choices: ["Pollo", "Atún"] }],
  },
  { id: "bebida-lata", categoryId: "almuerzos", name: "Bebida en lata", price: 1000, available: true },

  ...[
    "Mix natural 160g",
    "Maní tostado 200g",
    "Pasas 150g",
    "Almendras 100g",
    "Cranberries 150g",
    "Nueces 100g",
    "Semillas de zapallo 150g",
    "Plátanos deshidratados 150g",
    "Avellanas europeas 150g",
    "Maravillas 150g",
  ].map((n) => simple("naturales", n)),
  simple("naturales", "Avellanas chilenas 70g", 4000),

  ...[
    "Mix salado 160g",
    "Maní salado 200g",
    "Maní con merkén 200g",
    "Maní japonés 150g",
    "Maní japonés con pimentón 150g",
    "Castañas de cajú 90g",
    "Pistachos 90g",
  ].map((n) => simple("salados", n)),

  ...[
    "Maní confitado tradicional con sésamo 200g",
    "Maní confitado con frambuesa 200g",
    "Maní confitado frutilla 200g",
    "Maní confitado naranja 200g",
    "Cholitos 150g",
    "Almendras con chocolate 80g",
    "Almendras confitadas 150g",
    "Maravillas confitadas 150g",
    "Guagüitas 170g",
    "Gomitas 150g",
  ].map((n) => simple("dulces", n)),

  simple("otros", "Caja de cuchuflíes sin chocolate (28 un)", 7000),
  simple("otros", "Caja de cuchuflíes con chocolate (18 un)", 7000),
  simple("otros", "Caja de alfajores (8 un)", 7000),
  simple("otros", "Aceitunas con rocoto ½ kg", 4000),
  simple("otros", "Aceitunas tradicionales ½ kg", 4000),
  simple("otros", "Huesillos 350g", 3500),
  simple("otros", "Miel natural 500g", 4000),
  simple("otros", "Frutillas 1 kg", 5000),
  simple("otros", "Uvas 1 kg", 5000),
];
