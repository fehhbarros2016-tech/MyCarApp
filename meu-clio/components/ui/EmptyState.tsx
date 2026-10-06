import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import s from "./ui.module.css";

export function EmptyState({ icon, text, cta }: { icon: IconName; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className={s.empty}>
      <span className={s.icon}><Icon name={icon} size={18} /></span>
      <p>{text}</p>
      {cta && <Link className={s.btn} href={cta.href}><Icon name="plus" size={16} />{cta.label}</Link>}
    </div>
  );
}
