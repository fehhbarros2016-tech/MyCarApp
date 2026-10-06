// template.tsx remonta a cada navegação: é aqui que mora a transição entre telas.
import s from "./shell.module.css";

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className={s.view}>{children}</div>;
}
