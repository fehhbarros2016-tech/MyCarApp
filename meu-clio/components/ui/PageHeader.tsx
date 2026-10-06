import s from "./ui.module.css";

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className={`${s.ph} rv`}>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  );
}
