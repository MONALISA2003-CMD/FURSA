import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";
import "../jobs.css";

function safeReturnPath(locale: "en" | "ar", value: string | undefined) {
  const fallback = `/${locale}/jobs`;
  if (!value || value.length > 1800 || value.includes("\\")) return fallback;
  try {
    const base = "https://fursa.local";
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname !== fallback) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export default async function JobDetailPage({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]);
  if ((locale !== "en" && locale !== "ar") || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const backHref = safeReturnPath(locale, query.returnTo);
  return <JobDetailClient locale={locale} id={id} backHref={backHref} />;
}
