const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export const formatCLP = (n: number) => clp.format(n);

export const BUSINESS = {
  whatsapp: "56979608638",
  whatsappLabel: "+56 9 7960 8638",
  horario: "Lunes a viernes, 9:00 a 14:00 hrs",
  despacho: "A coordinar",
};
