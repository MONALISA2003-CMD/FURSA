import { notFound } from "next/navigation";
import JobResults from "./JobResults";
import "./jobs.css";

export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; country?: string; category?: string }>;
}) {
  const { locale } = await params;
  const { q, country, category } = await searchParams;
  if (locale !== "en" && locale !== "ar") notFound();
  return (
    <JobResults
      locale={locale}
      initialQuery={typeof q === "string" ? q.slice(0, 160) : ""}
      initialCountry={typeof country === "string" ? country.slice(0, 2).toUpperCase() : ""}
      initialCategory={typeof category === "string" ? category.slice(0, 80) : ""}
    />
  );
}
