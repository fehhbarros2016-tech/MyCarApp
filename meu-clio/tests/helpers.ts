// Monta um Store em memória para os testes (sem banco).
import { DEFAULT_SETTINGS } from "../lib/settings";
import type { Category, Expense, Store, Vehicle } from "../lib/store";

export const cat = (id: string, slug: string, group: Category["group"] = "uso", budget: number | null = null): Category =>
  ({ id, slug, name: slug, icon: "box", color: "#6ef095", group, sort: 0, archived: false, custom: false, budget });

let n = 0;
export const exp = (catId: string, date: string, amount: number, extra: Partial<Expense> = {}): Expense => ({
  id: `e${n++}`, date, amount, km: null, vendor: null, note: null, categoryId: catId, createdAt: `${date}T12:00:00Z`,
  fuel: null, maint: null, shopId: null, tripId: null, recurringId: null, ...extra,
});

export const vehicle = (extra: Partial<Vehicle> = {}): Vehicle => ({
  id: "v", name: "Clio", make: "Renault", model: "Clio", year: null, plate: null, heroWord: "CLIO", purchaseDate: null,
  purchasePrice: null, downPayment: null, initialKm: null, tankL: 50, bars: 9, imagePath: null, photoStyle: "recorte",
  info: {}, createdAt: "2026-01-01", ...extra,
});

export function store(expenses: Expense[], extra: Partial<Store> = {}, categories: Category[] = []): Store {
  const v = extra.vehicle ?? vehicle();
  return {
    name: "x", settings: { ...DEFAULT_SETTINGS }, categories, catById: new Map(categories.map((c) => [c.id, c])),
    vehicle: v, vehicles: [v],
    expenses: [...expenses].sort((a, b) => b.date.localeCompare(a.date)), installments: [], events: [], levels: [], odometer: [], odoManual: [],
    plan: [], parts: [], tires: [], issues: [], fines: [], trips: [], recurring: [], favorites: [], shops: [], annual: [], pushDevices: 0,
    ...extra,
  };
}
