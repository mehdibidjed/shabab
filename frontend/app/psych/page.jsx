import { getTranslations } from "next-intl/server";
import { PsychInbox } from "@/components/psych/inbox";
import { PageHeader } from "@/components/shared/page-header";
import { requireUsers } from "@/lib/guard";

export default async function Page() {
  await requireUsers(["psychologist"]);
  const t = await getTranslations("psychInboxPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PsychInbox />
    </div>
  );
}
