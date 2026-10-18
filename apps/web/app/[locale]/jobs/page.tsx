import { notFound } from "next/navigation";
import JobResults from "./JobResults";
import "./jobs.css";

type SearchParams = {
  q?: string;
  country?: string;
  region?: string;
  category?: string;
  work_mode?: string;
  employment_type?: string;
  sort?: string;
  page?: string;
};

function boundedText(value: string | undefined, maxLength: number, uppercase = false) {
  if (typeof value !== "string") return "";
  const result = value.slice(0, maxLength).trim();
  return uppercase ? result.toUpperCase() : result;
}
function positivePage(value: string | undefined) {
  if (!value || !/^\d{1,5}$/.test(value)) return 1;
  return Math.max(1, Math.min(10000, Number(value)));
}

export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (locale !== "en" && locale !== "ar") notFound();
  const validWorkModes = new Set(["ONSITE", "HYBRID", "REMOTE"]);
  const validEmploymentTypes = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERNSHIP", "OTHER"]);
  return (
    <JobResults
      locale={locale}
      initialQuery={boundedText(query.q, 160)}
      initialCountry={boundedText(query.country, 2, true)}
      initialRegion={boundedText(query.region, 80)}
      initialCategory={boundedText(query.category, 80)}
      initialWorkMode={validWorkModes.has(query.work_mode || "") ? query.work_mode || "" : ""}
      initialEmploymentType={validEmploymentTypes.has(query.employment_type || "") ? query.employment_type || "" : ""}
      initialSort={query.sort === "checked" ? "checked" : "newest"}
      initialPage={positivePage(query.page)}
    />
  );
}
