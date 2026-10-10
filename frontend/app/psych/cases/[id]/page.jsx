import { CaseFile } from "@/components/psych/case-file";
import { requireUsers } from "@/lib/guard";

export default async function CasePage({ params }) {
  await requireUsers(["psychologist"]);
  const { id } = await params;
  return <CaseFile id={id} />;
}
