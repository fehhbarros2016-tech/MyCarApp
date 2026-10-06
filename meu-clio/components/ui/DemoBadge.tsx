import { IS_PROD } from "@/lib/env";
import s from "./ui.module.css";

export function DemoBadge() {
  if (IS_PROD) return null;
  return <span className={s.badge} title="Ambiente de desenvolvimento">DESENVOLVIMENTO</span>;
}
