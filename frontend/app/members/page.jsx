import { MANAGEMENT_USERS } from "@/lib/demo-users";
import { requireUsers } from "@/lib/guard";
import { getTranslations } from "next-intl/server";
import { MembersView } from "@/components/members/members-view";
import { PageHeader } from "@/components/shared/page-header";
import { ScopeLine } from "@/components/shared/scope-line";

export default async function MembersPage({ searchParams }) {
  await requireUsers(MANAGEMENT_USERS);
  const { facility } = await searchParams;
  const t = await getTranslations("membersPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={<ScopeLine prefix={t("subtitle")} />} />
      <MembersView initialFacility={typeof facility === "string" ? facility : undefined} />
    </div>
  );
}
