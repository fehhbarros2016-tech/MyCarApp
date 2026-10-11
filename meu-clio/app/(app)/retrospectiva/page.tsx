import { redirect } from "next/navigation";
import { todayISO } from "@/lib/format";

export default function RetroIndex() {
  redirect(`/retrospectiva/${todayISO().slice(0, 4)}`);
}
