import BudgetApp from "./budget-app";
import { requireAppUser } from "./auth";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireAppUser("/");
  return <BudgetApp />;
}
