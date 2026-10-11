import { redirect } from "next/navigation";
import { addMonths, currentMonth } from "@/lib/format";

export default function ResumoIndex() {
  redirect(`/resumo/${addMonths(currentMonth(), -1)}`);
}
