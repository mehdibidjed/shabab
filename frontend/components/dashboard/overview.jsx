"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { useDemoUser } from "@/lib/demo-user";
import { AiInsights } from "./ai-insights";
import { CategoryChart, FacilityTypeChart, MembersChart } from "./charts";
import { FacilitiesTable } from "./facilities-table";
import { KpiCards } from "./kpi-cards";
import { OrgTree } from "./org-tree";
import { PsychSupportCard } from "./psych-support-card";

export function Overview() {
  const { user } = useDemoUser();
  const locale = useLocale();
  // Remount on role/language change: resets the tree selection and the AI
  // insights, which describe one scope in one language.
  return <OverviewContent key={`${user}:${locale}`} />;
}

function OverviewContent() {
  // Office selected in the org tree; filters the facilities table.
  const [office, setOffice] = useState(null);

  return (
    <div className="stagger flex flex-col gap-4 md:gap-5">
      <KpiCards />
      <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
        <MembersChart className="lg:col-span-2" />
        <AiInsights />
      </div>
      <div className="grid gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <CategoryChart />
        <FacilityTypeChart />
        <PsychSupportCard className="lg:col-span-2 xl:col-span-1" />
      </div>
      <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-3">
        <OrgTree selectedPath={office} onSelectOffice={setOffice} />
        <FacilitiesTable officePath={office} onClearOffice={() => setOffice(null)} className="lg:col-span-2" />
      </div>
    </div>
  );
}
