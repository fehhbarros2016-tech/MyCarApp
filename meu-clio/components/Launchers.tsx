"use client";

import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/client";
import { Icon } from "@/components/ui/Icon";
import { ExpenseForm, type CatLite } from "@/components/forms/ExpenseForm";
import { MaintenanceForm } from "@/components/forms/MaintenanceForm";
import { EventForm } from "@/components/forms/EventForm";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { AddInstallmentsForm, PlanForm } from "@/components/forms/InstallmentForms";
import { OdometerForm } from "@/components/QuickAdd";

function Launcher({ label, icon = "plus", title, className = "btn-primary sm", render }: {
  label: string; icon?: string; title: string; className?: string; render: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><Icon name={icon} size={16} />{label}</button>
      <Sheet open={open} onClose={close} title={title}>{open && render(close)}</Sheet>
    </>
  );
}

export const AddExpenseButton = ({ categories, lastKm, label = "Novo gasto", className }: { categories: CatLite[]; lastKm: number | null; label?: string; className?: string }) =>
  <Launcher label={label} title="Novo gasto" className={className} render={(c) => <ExpenseForm categories={categories} lastKm={lastKm} onDone={c} />} />;

export const AddMaintButton = ({ categories, lastKm, className }: { categories: CatLite[]; lastKm: number | null; className?: string }) =>
  <Launcher label="Nova manutenção" title="Nova manutenção" className={className} render={(c) => <MaintenanceForm categories={categories} lastKm={lastKm} onDone={c} />} />;

export const AddEventButton = ({ lastKm, className }: { lastKm: number | null; className?: string }) =>
  <Launcher label="Novo lembrete" title="Novo lembrete" className={className} render={(c) => <EventForm lastKm={lastKm} onDone={c} />} />;

export const NewCategoryButton = ({ className }: { className?: string }) =>
  <Launcher label="Nova categoria" title="Nova categoria" className={className} render={(c) => <CategoryForm onDone={c} />} />;

export const PlanButton = ({ className }: { className?: string }) =>
  <Launcher label="Cadastrar compra" icon="receipt" title="Compra e parcelas" className={className} render={(c) => <PlanForm onDone={c} />} />;

export const AddInstallmentsButton = ({ defaultAmount, nextDue, className = "btn-ghost sm" }: { defaultAmount: number; nextDue: string; className?: string }) =>
  <Launcher label="Adicionar parcelas" title="Adicionar parcelas" className={className} render={(c) => <AddInstallmentsForm defaultAmount={defaultAmount} nextDue={nextDue} onDone={c} />} />;

export const OdometerButton = ({ lastKm, className = "btn-ghost sm" }: { lastKm: number | null; className?: string }) =>
  <Launcher label="Atualizar km" icon="road" title="Quilometragem atual" className={className} render={(c) => <OdometerForm lastKm={lastKm} onDone={c} />} />;
