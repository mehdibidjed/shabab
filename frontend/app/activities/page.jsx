import { getTranslations } from "next-intl/server";
import { ActivitiesView } from "@/components/activities/activities-view";
import { PageHeader } from "@/components/shared/page-header";
import { ScopeLine } from "@/components/shared/scope-line";

export default async function ActivitiesPage({ searchParams }) {
  const { facility, category } = await searchParams;
  const t = await getTranslations("activitiesPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={<ScopeLine prefix={t("subtitle")} />} />
      <ActivitiesView
        initialFacility={typeof facility === "string" ? facility : undefined}
        initialCategory={typeof category === "string" ? category : undefined}
      />
    </div>
  );
}
