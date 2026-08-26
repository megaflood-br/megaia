import { requireUser } from "@/lib/auth";
import { CrmBoard } from "./crm-board";

export default async function CrmPage() {
  await requireUser();
  return <CrmBoard />;
}
