// Leitura única do banco por requisição: a função app_snapshot() devolve tudo em UMA ida e volta
// (e antes lança os gastos recorrentes vencidos). React cache() faz layout e página dividirem o resultado.
import { cache } from "react";
import { db, isDbConfigured } from "@/lib/supabase/server";
import { parseSettings, type Settings } from "@/lib/settings";

export type CostGroup = "uso" | "manutencao" | "protecao" | "documentacao" | "estetica" | "modificacoes" | "outros";

export type Category = {
  id: string; slug: string; name: string; icon: string; color: string;
  group: CostGroup; sort: number; archived: boolean; custom: boolean; budget: number | null;
};
export type FuelInfo = {
  liters: number; price: number; fuelType: string; fullTank: boolean;
  source: "bomba" | "marcador"; before: number | null; after: number | null;
};
export type MaintInfo = {
  system: string; service: string; parts: number; labor: number;
  nextDate: string | null; nextKm: number | null; planId: string | null;
};
export type Expense = {
  id: string; date: string; amount: number; km: number | null; vendor: string | null; note: string | null;
  categoryId: string; createdAt: string; fuel: FuelInfo | null; maint: MaintInfo | null;
  shopId: string | null; tripId: string | null; recurringId: string | null;
};
export type Installment = { id: string; number: number; amount: number; dueDate: string; paidAt: string | null; note: string | null };
export type AgendaEvent = {
  id: string; kind: string; title: string; dueDate: string | null; dueKm: number | null;
  repeatMonths: number | null; repeatKm: number | null; doneAt: string | null; note: string | null; expenseId: string | null;
};
export type LevelReading = { id: string; date: string; km: number | null; bars: number; liters: number; context: "antes" | "depois" | "manual"; expenseId: string | null; createdAt: string };
export type OdoReading = { id: string | null; date: string; km: number; source: "compra" | "manual" | "gasto"; createdAt: string };

export type VehicleInfo = Partial<Record<
  "chassi" | "renavam" | "cor" | "motor" | "combustivel" | "pneuMedida" | "pressaoDianteira" | "pressaoTraseira" |
  "oleo" | "oleoLitros" | "seguradora" | "apolice" | "seguroTel" | "guinchoTel" | "notas", string>>;

export type Vehicle = {
  id: string; name: string; make: string | null; model: string | null; year: number | null; plate: string | null;
  heroWord: string; purchaseDate: string | null; purchasePrice: number | null; downPayment: number | null;
  initialKm: number | null; tankL: number; bars: number; imagePath: string | null; photoStyle: "recorte" | "foto";
  info: VehicleInfo; createdAt: string;
};

export type PlanItem = {
  id: string; name: string; system: string; categorySlug: string | null; keyword: string | null;
  intervalKm: number | null; intervalMonths: number | null; lastKm: number | null; lastDate: string | null; note: string | null; sort: number;
};
export type Part = {
  id: string; name: string; brand: string | null; system: string; price: number | null; installedOn: string; installedKm: number | null;
  lifeKm: number | null; lifeMonths: number | null; imagePath: string | null; note: string | null; shopId: string | null;
  expenseId: string | null; replacedOn: string | null; replacedBy: string | null; createdAt: string;
};
export type TireEvent = {
  id: string; kind: "troca" | "rodizio" | "calibragem" | "reparo"; date: string; km: number | null;
  front: number | null; rear: number | null; positions: string | null; brand: string | null; size: string | null;
  cost: number | null; shopId: string | null; expenseId: string | null; note: string | null; createdAt: string;
};
export type Issue = {
  id: string; title: string; description: string | null; severity: "baixa" | "media" | "alta"; noticedOn: string; km: number | null;
  resolvedOn: string | null; resolution: string | null; shopId: string | null; expenseId: string | null;
};
export type Fine = {
  id: string; description: string; severity: "leve" | "media" | "grave" | "gravissima"; points: number; occurredOn: string | null;
  dueDate: string | null; amount: number | null; status: "aberta" | "paga" | "recurso" | "cancelada"; note: string | null; expenseId: string | null;
};
export type Trip = { id: string; name: string; startDate: string; endDate: string | null; startKm: number | null; endKm: number | null; note: string | null };
export type Recurring = {
  id: string; categoryId: string; amount: number; note: string | null; vendor: string | null; shopId: string | null;
  frequency: "semanal" | "mensal" | "anual"; anchorDay: number | null; nextDate: string; endDate: string | null; paused: boolean;
};
export type Favorite = { id: string; label: string; categoryId: string; amount: number; note: string | null; vendor: string | null; sort: number };
export type Shop = { id: string; name: string; kind: "oficina" | "posto" | "loja" | "outro"; phone: string | null; address: string | null; note: string | null };
export type AnnualCost = { id: string; name: string; categoryId: string | null; amount: number; dueMonth: number; note: string | null };

export type Store = {
  name: string | null;
  settings: Settings;
  vehicle: Vehicle;
  vehicles: Vehicle[];
  categories: Category[];
  catById: Map<string, Category>;
  expenses: Expense[];        // sem excluídos, mais recentes primeiro
  installments: Installment[];
  events: AgendaEvent[];
  levels: LevelReading[];     // em ordem cronológica, sem as de gastos excluídos
  odometer: OdoReading[];     // compra + manual + km de gastos ativos, em ordem cronológica
  odoManual: OdoReading[];    // só as leituras manuais (para corrigir)
  plan: PlanItem[];
  parts: Part[];
  tires: TireEvent[];
  issues: Issue[];
  fines: Fine[];
  trips: Trip[];
  recurring: Recurring[];
  favorites: Favorite[];
  shops: Shop[];
  annual: AnnualCost[];
  pushDevices: number;
};

type Row = Record<string, unknown>;
const n = (v: unknown) => (v == null ? null : Number(v));
const s = (v: unknown) => (v == null ? null : String(v));
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

export function mapVehicle(v: Row): Vehicle {
  const info = v.info && typeof v.info === "object" ? (v.info as VehicleInfo) : {};
  return {
    id: String(v.id), name: String(v.name ?? "Meu carro"), make: s(v.make), model: s(v.model), year: n(v.year), plate: s(v.plate),
    heroWord: String(v.hero_word || "CARRO"), purchaseDate: s(v.purchase_date), purchasePrice: n(v.purchase_price),
    downPayment: n(v.down_payment), initialKm: n(v.initial_odometer),
    tankL: Number(v.tank_capacity_l ?? 50), bars: Number(v.gauge_bars ?? 9),
    imagePath: s(v.image_path), photoStyle: v.photo_style === "foto" ? "foto" : "recorte", info, createdAt: String(v.created_at ?? ""),
  };
}

async function snapshot(): Promise<Row> {
  const { data, error } = await db().rpc("app_snapshot");
  if (error) throw new Error(`Falha ao ler o banco: ${error.message}`);
  return (data ?? {}) as Row;
}

async function load(): Promise<Store | null> {
  if (!isDbConfigured()) return null;
  let snap = await snapshot();
  if (!snap.vehicle_id) {
    // Banco novo: garante um veículo (sem valores) para o app ter onde guardar os registros.
    const created = await db().from("vehicles").insert({ name: "Meu carro", hero_word: "CARRO" }).select("id").single();
    if (created.error) throw new Error(created.error.message);
    snap = await snapshot();
  }
  const vid = String(snap.vehicle_id);
  const vehicles = arr(snap.vehicles).map(mapVehicle);
  const vehicle = vehicles.find((v) => v.id === vid) ?? vehicles[0];

  const categories: Category[] = arr(snap.categories).map((c) => ({
    id: String(c.id), slug: String(c.slug), name: String(c.name), icon: String(c.icon), color: String(c.color ?? "#6ef095"),
    group: c.cost_group as CostGroup, sort: Number(c.sort), archived: Boolean(c.archived_at), custom: Boolean(c.is_custom),
    budget: n(c.monthly_budget),
  }));

  const expenses: Expense[] = arr(snap.expenses).map((e) => {
    const f = e.fuel as Row | null;
    const m = e.maint as Row | null;
    return {
      id: String(e.id), date: String(e.occurred_on), amount: Number(e.amount), km: n(e.odometer), vendor: s(e.vendor), note: s(e.note),
      categoryId: String(e.category_id), createdAt: String(e.created_at),
      shopId: s(e.shop_id), tripId: s(e.trip_id), recurringId: s(e.recurring_id),
      fuel: f ? { liters: Number(f.liters), price: Number(f.price_per_liter), fuelType: String(f.fuel_type),
        fullTank: Boolean(f.full_tank), source: f.liters_source === "marcador" ? "marcador" : "bomba",
        before: n(f.gauge_before), after: n(f.gauge_after) } : null,
      maint: m ? { system: String(m.system), service: String(m.service), parts: Number(m.parts_cost), labor: Number(m.labor_cost),
        nextDate: s(m.next_due_date), nextKm: n(m.next_due_km), planId: s(m.plan_id) } : null,
    };
  });

  const odoManual: OdoReading[] = arr(snap.odometer).map((o) => ({
    id: String(o.id), date: String(o.read_on), km: Number(o.km), source: "manual" as const, createdAt: String(o.created_at),
  }));
  const odometer: OdoReading[] = [
    ...(vehicle.initialKm != null ? [{ id: null, date: vehicle.purchaseDate ?? "1900-01-01", km: vehicle.initialKm, source: "compra" as const, createdAt: "" }] : []),
    ...odoManual,
    ...expenses.filter((e) => e.km != null).map((e) => ({ id: null, date: e.date, km: e.km as number, source: "gasto" as const, createdAt: e.createdAt })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  return {
    name: s((snap.profile as Row | null)?.display_name),
    settings: parseSettings(snap.prefs),
    vehicle,
    vehicles,
    categories,
    catById: new Map(categories.map((c) => [c.id, c])),
    expenses,
    installments: arr(snap.installments).map((i) => ({
      id: String(i.id), number: Number(i.number), amount: Number(i.amount), dueDate: String(i.due_date), paidAt: s(i.paid_at), note: s(i.note),
    })),
    events: arr(snap.events).map((e) => ({
      id: String(e.id), kind: String(e.kind), title: String(e.title), dueDate: s(e.due_date), dueKm: n(e.due_km),
      repeatMonths: n(e.repeat_months), repeatKm: n(e.repeat_km), doneAt: s(e.done_at), note: s(e.note), expenseId: s(e.expense_id),
    })),
    levels: arr(snap.levels).map((l) => ({
      id: String(l.id), date: String(l.read_on), km: n(l.km), bars: Number(l.bars), liters: Number(l.liters),
      context: l.context as LevelReading["context"], expenseId: s(l.expense_id), createdAt: String(l.created_at),
    })),
    odometer,
    odoManual,
    plan: arr(snap.plan).map((p) => ({
      id: String(p.id), name: String(p.name), system: String(p.system), categorySlug: s(p.category_slug), keyword: s(p.keyword),
      intervalKm: n(p.interval_km), intervalMonths: n(p.interval_months), lastKm: n(p.last_km), lastDate: s(p.last_date),
      note: s(p.note), sort: Number(p.sort ?? 0),
    })),
    parts: arr(snap.parts).map((p) => ({
      id: String(p.id), name: String(p.name), brand: s(p.brand), system: String(p.system), price: n(p.price),
      installedOn: String(p.installed_on), installedKm: n(p.installed_km), lifeKm: n(p.life_km), lifeMonths: n(p.life_months),
      imagePath: s(p.image_path), note: s(p.note), shopId: s(p.shop_id), expenseId: s(p.expense_id),
      replacedOn: s(p.replaced_on), replacedBy: s(p.replaced_by), createdAt: String(p.created_at),
    })),
    tires: arr(snap.tires).map((t) => ({
      id: String(t.id), kind: t.kind as TireEvent["kind"], date: String(t.done_on), km: n(t.km),
      front: n(t.pressure_front), rear: n(t.pressure_rear), positions: s(t.positions), brand: s(t.brand), size: s(t.size),
      cost: n(t.cost), shopId: s(t.shop_id), expenseId: s(t.expense_id), note: s(t.note), createdAt: String(t.created_at),
    })),
    issues: arr(snap.issues).map((i) => ({
      id: String(i.id), title: String(i.title), description: s(i.description), severity: i.severity as Issue["severity"],
      noticedOn: String(i.noticed_on), km: n(i.km), resolvedOn: s(i.resolved_on), resolution: s(i.resolution),
      shopId: s(i.shop_id), expenseId: s(i.expense_id),
    })),
    fines: arr(snap.fines).map((f) => ({
      id: String(f.id), description: String(f.description), severity: f.severity as Fine["severity"], points: Number(f.points),
      occurredOn: s(f.occurred_on), dueDate: s(f.due_date), amount: n(f.amount), status: f.status as Fine["status"],
      note: s(f.note), expenseId: s(f.expense_id),
    })),
    trips: arr(snap.trips).map((t) => ({
      id: String(t.id), name: String(t.name), startDate: String(t.start_date), endDate: s(t.end_date),
      startKm: n(t.start_km), endKm: n(t.end_km), note: s(t.note),
    })),
    recurring: arr(snap.recurring).map((r) => ({
      id: String(r.id), categoryId: String(r.category_id), amount: Number(r.amount), note: s(r.note), vendor: s(r.vendor),
      shopId: s(r.shop_id), frequency: r.frequency as Recurring["frequency"], anchorDay: n(r.anchor_day),
      nextDate: String(r.next_date), endDate: s(r.end_date), paused: Boolean(r.paused_at),
    })),
    favorites: arr(snap.favorites).map((f) => ({
      id: String(f.id), label: String(f.label), categoryId: String(f.category_id), amount: Number(f.amount),
      note: s(f.note), vendor: s(f.vendor), sort: Number(f.sort ?? 0),
    })),
    shops: arr(snap.shops).map((x) => ({
      id: String(x.id), name: String(x.name), kind: x.kind as Shop["kind"], phone: s(x.phone), address: s(x.address), note: s(x.note),
    })),
    annual: arr(snap.annual).map((a) => ({
      id: String(a.id), name: String(a.name), categoryId: s(a.category_id), amount: Number(a.amount), dueMonth: Number(a.due_month), note: s(a.note),
    })),
    pushDevices: Number(snap.push_devices ?? 0),
  };
}

export const getStore = cache(load);
