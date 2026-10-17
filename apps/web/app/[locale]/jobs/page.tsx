import Link from "next/link";
import { notFound } from "next/navigation";

export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  if (locale !== "en" && locale !== "ar") notFound();
  const ar = locale === "ar";
  return (
    <main className="empty-page" lang={locale} dir={ar ? "rtl" : "ltr"}>
      <Link href={`/${locale}`} className="back-link">← {ar ? "العودة إلى فرصة" : "Back to FURSA"}</Link>
      <span className="eyebrow muted-eyebrow">{ar ? "فهرس الوظائف" : "JOB CATALOGUE"}</span>
      <h1>{ar ? "الوظائف قيد التجهيز" : "The job catalogue is getting ready"}</h1>
      {q ? <p>{ar ? `عبارة البحث: “${q}”` : `Search query: “${q}”`}</p> : null}
      <p>{ar ? "ستظهر الوظائف بعد اكتمال إعداد سجلات الوظائف والبحث ومراجعة المتطوعين." : "Listings will appear after the job records, search, and volunteer review workflow are implemented."}</p>
      <div className="empty-status"><span className="status-dot" /> {ar ? "مرحلة البناء الأولى" : "Initial build phase"}</div>
    </main>
  );
}
