"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/client";
import { Icon } from "@/components/ui/Icon";
import type { CatLite, TripLite } from "@/components/forms/ExpenseForm";
import type { ShopLite } from "@/components/forms/ShopPicker";
import type { MaintInitial } from "@/components/forms/MaintenanceForm";
import type { InfoFields, IssueInitial, PartInitial, PlanInitial, ShopInitial, TireInitial } from "@/components/forms/CarForms";
import type { AnnualInitial, FavInitial, FineInitial, RecInitial, TripInitial } from "@/components/forms/MoneyForms";

const Loading = () => <div className="form-skel"><i /><i /><i /></div>;
const ExpenseForm = dynamic(() => import("@/components/forms/ExpenseForm").then((m) => m.ExpenseForm), { loading: Loading });
const MaintenanceForm = dynamic(() => import("@/components/forms/MaintenanceForm").then((m) => m.MaintenanceForm), { loading: Loading });
const EventForm = dynamic(() => import("@/components/forms/EventForm").then((m) => m.EventForm), { loading: Loading });
const CategoryForm = dynamic(() => import("@/components/forms/CategoryForm").then((m) => m.CategoryForm), { loading: Loading });
const PlanForm = dynamic(() => import("@/components/forms/InstallmentForms").then((m) => m.PlanForm), { loading: Loading });
const AddInstallmentsForm = dynamic(() => import("@/components/forms/InstallmentForms").then((m) => m.AddInstallmentsForm), { loading: Loading });
const OdometerForm = dynamic(() => import("@/components/QuickAdd").then((m) => m.OdometerForm), { loading: Loading });
const IssueForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.IssueForm), { loading: Loading });
const ResolveIssueForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.ResolveIssueForm), { loading: Loading });
const TireForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.TireForm), { loading: Loading });
const PlanItemForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.PlanItemForm), { loading: Loading });
const PartForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.PartForm), { loading: Loading });
const ShopForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.ShopForm), { loading: Loading });
const AddVehicleForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.AddVehicleForm), { loading: Loading });
const VehicleInfoForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.VehicleInfoForm), { loading: Loading });
const FineForm = dynamic(() => import("@/components/forms/MoneyForms").then((m) => m.FineForm), { loading: Loading });
const TripForm = dynamic(() => import("@/components/forms/MoneyForms").then((m) => m.TripForm), { loading: Loading });
const AnnualForm = dynamic(() => import("@/components/forms/MoneyForms").then((m) => m.AnnualForm), { loading: Loading });
const FavoriteForm = dynamic(() => import("@/components/forms/MoneyForms").then((m) => m.FavoriteForm), { loading: Loading });
const RecurringForm = dynamic(() => import("@/components/forms/MoneyForms").then((m) => m.RecurringForm), { loading: Loading });

/** Botão que abre um painel com um formulário. "children" troca o conteúdo do botão (ex.: um card inteiro). */
export function Launcher({ label, icon = "plus", title, className = "btn-primary sm", render, children, startOpen = false }: {
  label?: string; icon?: string; title: string; className?: string; render: (close: () => void) => ReactNode; children?: ReactNode; startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children ?? <><Icon name={icon} size={16} />{label}</>}</button>
      <Sheet open={open} onClose={close} title={title}>{open && render(close)}</Sheet>
    </>
  );
}

type Btn = { className?: string; label?: string; children?: ReactNode; startOpen?: boolean };

export const AddExpenseButton = ({ categories, lastKm, label = "Novo gasto", className, trip }: { categories: CatLite[]; lastKm: number | null; label?: string; className?: string; trip?: TripLite | null }) =>
  <Launcher label={label} title="Novo gasto" className={className} render={(c) => <ExpenseForm categories={categories} lastKm={lastKm} onDone={c} trip={trip} />} />;

export const AddMaintButton = ({ categories, lastKm, className, shops = [], initial, label = "Nova", title = "Nova manutenção", children }: Btn & { categories: CatLite[]; lastKm: number | null; shops?: ShopLite[]; initial?: MaintInitial; title?: string }) =>
  <Launcher label={label} title={title} className={className} render={(c) => <MaintenanceForm categories={categories} lastKm={lastKm} onDone={c} shops={shops} initial={initial} />}>{children}</Launcher>;

export const AddEventButton = ({ lastKm, className }: { lastKm: number | null; className?: string }) =>
  <Launcher label="Novo" title="Novo lembrete" className={className} render={(c) => <EventForm lastKm={lastKm} onDone={c} />} />;

export const NewCategoryButton = ({ className }: { className?: string }) =>
  <Launcher label="Nova" title="Nova categoria" className={className} render={(c) => <CategoryForm onDone={c} />} />;

export const PlanButton = ({ className }: { className?: string }) =>
  <Launcher label="Cadastrar compra" icon="receipt" title="Compra e parcelas" className={className} render={(c) => <PlanForm onDone={c} />} />;

export const AddInstallmentsButton = ({ defaultAmount, nextDue, className = "btn-ghost sm" }: { defaultAmount: number; nextDue: string; className?: string }) =>
  <Launcher label="Adicionar parcelas" title="Adicionar parcelas" className={className} render={(c) => <AddInstallmentsForm defaultAmount={defaultAmount} nextDue={nextDue} onDone={c} />} />;

export const OdometerButton = ({ lastKm, className = "btn-ghost sm", history }: { lastKm: number | null; className?: string; history?: { id: string; date: string; km: number }[] }) =>
  <Launcher label="Atualizar km" icon="road" title="Quilometragem atual" className={className} render={(c) => <OdometerForm lastKm={lastKm} onDone={c} history={history} />} />;

// ---------- carro ----------
export const IssueButton = ({ lastKm, initial, className = "btn-primary sm", label = "Anotar", children }: Btn & { lastKm: number | null; initial?: IssueInitial }) =>
  <Launcher label={label} title={initial?.id ? "Problema" : "Anotar problema"} className={className} render={(c) => <IssueForm lastKm={lastKm} initial={initial} onDone={c} />}>{children}</Launcher>;

export const ResolveIssueButton = ({ id, shops, className = "btn-ghost sm" }: { id: string; shops: ShopLite[]; className?: string }) =>
  <Launcher label="Resolvido" icon="check" title="Problema resolvido" className={className} render={(c) => <ResolveIssueForm id={id} shops={shops} onDone={c} />} />;

export const TireButton = ({ lastKm, shops, initial, defaultSize, recommended, className = "btn-primary sm", label = "Registrar", children }: Btn & {
  lastKm: number | null; shops: ShopLite[]; initial?: TireInitial; defaultSize?: string | null; recommended?: { front: string | null; rear: string | null } }) =>
  <Launcher label={label} title="Pneus" className={className} render={(c) => <TireForm lastKm={lastKm} shops={shops} initial={initial} defaultSize={defaultSize} recommended={recommended} onDone={c} />}>{children}</Launcher>;

export const PlanItemButton = ({ initial, className = "btn-ghost sm", label = "Novo item", children }: Btn & { initial?: PlanInitial }) =>
  <Launcher label={label} title={initial?.id ? "Item do plano" : "Novo item do plano"} className={className} render={(c) => <PlanItemForm initial={initial} onDone={c} />}>{children}</Launcher>;

export const PartButton = ({ lastKm, shops, initial, replaceable, className = "btn-primary sm", label = "Nova peça", children, startOpen }: Btn & {
  lastKm: number | null; shops: ShopLite[]; initial?: PartInitial; replaceable?: { id: string; name: string }[] }) =>
  <Launcher label={label} title={initial?.id ? "Peça" : "Nova peça"} className={className} startOpen={startOpen} render={(c) => <PartForm lastKm={lastKm} shops={shops} initial={initial} replaceable={replaceable} onDone={c} />}>{children}</Launcher>;

export const ShopButton = ({ initial, className = "btn-primary sm", label = "Nova", children }: Btn & { initial?: ShopInitial }) =>
  <Launcher label={label} title={initial?.id ? "Oficina" : "Nova oficina"} className={className} render={(c) => <ShopForm initial={initial} onDone={c} />}>{children}</Launcher>;

export const AddVehicleButton = ({ className = "btn-ghost sm" }: { className?: string }) =>
  <Launcher label="Adicionar veículo" title="Novo veículo" className={className} render={(c) => <AddVehicleForm onDone={c} />} />;

export const VehicleInfoButton = ({ id, info, className = "btn-primary sm" }: { id: string; info: InfoFields; className?: string }) =>
  <Launcher label="Editar ficha" icon="edit" title="Ficha do carro" className={className} render={(c) => <VehicleInfoForm id={id} info={info} onDone={c} />} />;

// ---------- dinheiro e uso ----------
export const FineButton = ({ initial, className = "btn-primary sm", label = "Nova", children }: Btn & { initial?: FineInitial }) =>
  <Launcher label={label} title={initial?.id ? "Multa" : "Nova multa"} className={className} render={(c) => <FineForm initial={initial} onDone={c} />}>{children}</Launcher>;

export const TripButton = ({ initial, lastKm, className = "btn-primary sm", label = "Nova viagem", children }: Btn & { initial?: TripInitial; lastKm?: number | null }) =>
  <Launcher label={label} title={initial?.id ? "Viagem" : "Nova viagem"} className={className} render={(c) => <TripForm initial={initial} lastKm={lastKm} onDone={c} />}>{children}</Launcher>;

export const AnnualButton = ({ initial, categories, className = "btn-ghost sm", label = "Adicionar", children }: Btn & { initial?: AnnualInitial; categories: CatLite[] }) =>
  <Launcher label={label} title={initial?.id ? "Gasto anual" : "Novo gasto anual"} className={className} render={(c) => <AnnualForm initial={initial} categories={categories} onDone={c} />}>{children}</Launcher>;

export const FavoriteButton = ({ initial, categories, className = "btn-primary sm", label = "Novo", children }: Btn & { initial?: FavInitial; categories: CatLite[] }) =>
  <Launcher label={label} title={initial?.id ? "Favorito" : "Novo favorito"} className={className} render={(c) => <FavoriteForm initial={initial} categories={categories} onDone={c} />}>{children}</Launcher>;

export const RecurringButton = ({ initial, categories, className = "btn-ghost sm", children }: Btn & { initial: RecInitial; categories: CatLite[] }) =>
  <Launcher title="Gasto recorrente" className={className} render={(c) => <RecurringForm initial={initial} categories={categories} onDone={c} />}>{children}</Launcher>;
