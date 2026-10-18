import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";
import "../jobs.css";

export default async function JobDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if ((locale !== "en" && locale !== "ar") || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <JobDetailClient locale={locale} id={id} />;
}
