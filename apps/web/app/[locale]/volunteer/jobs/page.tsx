import { notFound } from "next/navigation";
import JobsClient from "./JobsClient";

type Locale = "en" | "ar";
export default async function VolunteerJobsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  return <JobsClient locale={rawLocale as Locale} />;
}
