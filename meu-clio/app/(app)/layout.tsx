import { Sidebar, TabBar } from "@/components/nav/Nav";
import s from "./shell.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.shell}>
      <Sidebar />
      <main className={s.main}>{children}</main>
      <TabBar />
    </div>
  );
}
