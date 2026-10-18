"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Locale = "en" | "ar";
type Source = { name: string; source_url: string; source_last_checked_at: string | null };
type Country = { code: string; name_en: string; name_ar: string };
type Region = { code: string; name_en: string; name_ar: string; country_code: string };
type Category = { slug: string; name_en: string; name_ar: string };
type ApplyRoute = { route_type: "WEBSITE" | "EMAIL" | "WHATSAPP"; destination: string; last_checked_at: string | null };
type Job = {
  id: string; title_original: string; title_en: string; title_ar: string; employer_name: string;
  description_original: string; description_en: string; description_ar: string;
  country: Country; region: Region | null; category: Category | null;
  employment_type: string; work_mode: string; salary_min: string | null; salary_max: string | null;
  salary_currency: string; salary_period: string; eligibility_text: string; sponsorship_status: string;
  original_posted_at: string | null; published_at: string | null; last_checked_at: string | null;
  deadline_at: string | null; sources: Source[]; application_routes: ApplyRoute[];
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const copy = {
  en: {
    back: "Back to job search", loading: "Loading job details…", error: "This job could not be loaded. It may have been withdrawn or expired.",
    retry: "Try again", employer: "Employer", location: "Country / region", category: "Category", workMode: "Work mode", jobType: "Employment type",
    salary: "Salary", eligibility: "Eligibility and sponsorship", description: "Job description", source: "Original source", sourceLink: "Open source page",
    published: "Published on FURSA", originalDate: "Original posting date", lastChecked: "Last checked", deadline: "Application deadline",
    notSpecified: "Not specified by employer", apply: "Apply externally", applyWebsite: "Employer / recruiter website", applyEmail: "Email", applyWhatsApp: "WhatsApp",
    sponsorship: { OFFERED: "Offered", NOT_OFFERED: "Not offered", NOT_SPECIFIED: "Not specified" } as Record<string, string>,
    types: { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", TEMPORARY: "Temporary", INTERNSHIP: "Internship", OTHER: "Other" } as Record<string, string>,
    modes: { ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" } as Record<string, string>,
    periods: { HOURLY: "per hour", DAILY: "per day", MONTHLY: "per month", ANNUAL: "per year", OTHER: "" } as Record<string, string>,
  },
  ar: {
    back: "العودة إلى البحث", loading: "جارٍ تحميل تفاصيل الوظيفة…", error: "تعذّر تحميل الوظيفة. ربما تم سحب الإعلان أو انتهت صلاحيته.",
    retry: "حاول مجدداً", employer: "جهة العمل", location: "الدولة / المنطقة", category: "الفئة", workMode: "نظام العمل", jobType: "نوع التوظيف",
    salary: "الراتب", eligibility: "الأهلية والكفالة", description: "وصف الوظيفة", source: "المصدر الأصلي", sourceLink: "افتح صفحة المصدر",
    published: "تاريخ النشر في فرصة", originalDate: "تاريخ النشر الأصلي", lastChecked: "آخر مراجعة", deadline: "موعد التقديم النهائي",
    notSpecified: "لم يحدده صاحب العمل", apply: "التقديم عبر جهة خارجية", applyWebsite: "موقع جهة العمل / التوظيف", applyEmail: "البريد الإلكتروني", applyWhatsApp: "واتساب",
    sponsorship: { OFFERED: "متاح", NOT_OFFERED: "غير متاح", NOT_SPECIFIED: "غير محدد" } as Record<string, string>,
    types: { FULL_TIME: "دوام كامل", PART_TIME: "دوام جزئي", CONTRACT: "عقد", TEMPORARY: "مؤقت", INTERNSHIP: "تدريب", OTHER: "أخرى" } as Record<string, string>,
    modes: { ONSITE: "من مقر العمل", HYBRID: "هجين", REMOTE: "عن بُعد" } as Record<string, string>,
    periods: { HOURLY: "في الساعة", DAILY: "في اليوم", MONTHLY: "شهرياً", ANNUAL: "سنوياً", OTHER: "" } as Record<string, string>,
  },
} satisfies Record<Locale, Record<string, unknown>>;

function dateLabel(value: string | null, locale: Locale) {
  if (!value) return locale === "ar" ? "لم يحدده صاحب العمل" : "Not specified by employer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ar" ? "لم يحدده صاحب العمل" : "Not specified by employer";
  return date.toLocaleDateString(locale === "ar" ? "ar" : "en", { year: "numeric", month: "short", day: "numeric" });
}

function safeDestination(route: ApplyRoute) {
  try {
    if (route.route_type === "EMAIL" && route.destination.toLowerCase().startsWith("mailto:")) return route.destination;
    const url = new URL(route.destination);
    if (url.protocol !== "https:") return null;
    if (route.route_type === "WHATSAPP" && !["wa.me", "api.whatsapp.com"].includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function titleFor(job: Job, locale: Locale) {
  return (locale === "ar" ? job.title_ar : job.title_en) || job.title_original;
}

export default function JobDetailClient({ locale, id }: { locale: Locale; id: string }) {
  const t = copy[locale];
  const isArabic = locale === "ar";
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/v1/jobs/${id}/`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Job unavailable");
        return response.json() as Promise<Job>;
      })
      .then(setJob)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, retryKey]);

  function applyLabel(route: ApplyRoute) {
    if (route.route_type === "EMAIL") return t.applyEmail as string;
    if (route.route_type === "WHATSAPP") return t.applyWhatsApp as string;
    return t.applyWebsite as string;
  }

  function factValue(value: string | null | undefined) {
    return value || (t.notSpecified as string);
  }

  const descriptions = job ? ((isArabic ? job.description_ar : job.description_en) || job.description_original) : "";
  const salary = job && (job.salary_min || job.salary_max)
    ? `${job.salary_min || "—"} – ${job.salary_max || "—"} ${job.salary_currency || ""} ${(t.periods as Record<string, string>)[job.salary_period] || ""}`.trim()
    : (t.notSpecified as string);

  return (
    <main className="job-page job-detail-page" lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <Link href={`/${locale}/jobs`} className="back-link">← {t.back as string}</Link>
      {loading ? <div className="job-state" role="status">{t.loading as string}</div> : null}
      {error ? <div className="job-state job-state-error" role="alert"><p>{t.error as string}</p><button type="button" className="job-secondary-button" onClick={() => setRetryKey((value) => value + 1)}>{t.retry as string}</button></div> : null}
      {!loading && !error && job ? (
        <article>
          <header className="job-detail-header">
            <span className="job-country-label">{isArabic ? job.country.name_ar : job.country.name_en}</span>
            <h1>{titleFor(job, locale)}</h1>
            <p className="job-employer">{job.employer_name || (t.notSpecified as string)}</p>
            <div className="job-facts">
              {job.region ? <span>{isArabic ? job.region.name_ar : job.region.name_en}</span> : null}
              {job.category ? <span>{isArabic ? job.category.name_ar : job.category.name_en}</span> : null}
            </div>
            <dl className="job-meta-grid">
              <div><dt>{t.published as string}</dt><dd>{dateLabel(job.published_at, locale)}</dd></div>
              <div><dt>{t.originalDate as string}</dt><dd>{dateLabel(job.original_posted_at, locale)}</dd></div>
              <div><dt>{t.lastChecked as string}</dt><dd>{dateLabel(job.last_checked_at, locale)}</dd></div>
              <div><dt>{t.deadline as string}</dt><dd>{dateLabel(job.deadline_at, locale)}</dd></div>
            </dl>
          </header>

          <div className="job-detail-columns">
            <div className="job-detail-main">
              <section className="job-detail-section">
                <h2>{t.description as string}</h2>
                {descriptions ? <p className="job-description-text">{descriptions}</p> : <p>{t.notSpecified as string}</p>}
              </section>
              <section className="job-detail-section">
                <h2>{t.eligibility as string}</h2>
                <p>{factValue(job.eligibility_text)}</p>
                <p><strong>{isArabic ? "حالة الكفالة:" : "Sponsorship:"}</strong> {(t.sponsorship as Record<string, string>)[job.sponsorship_status] || (t.notSpecified as string)}</p>
              </section>
              <section className="job-detail-section">
                <h2>{t.source as string}</h2>
                {job.sources.length ? job.sources.map((source, index) => (
                  <div className="job-source-card" key={`${source.source_url}-${index}`}>
                    <strong>{source.name}</strong>
                    <p>{t.lastChecked as string}: {dateLabel(source.source_last_checked_at, locale)}</p>
                    <a href={source.source_url} target="_blank" rel="noopener noreferrer nofollow">{t.sourceLink as string} ↗</a>
                  </div>
                )) : <p>{t.notSpecified as string}</p>}
              </section>
            </div>
            <aside className="job-detail-aside">
              <h2>{t.apply as string}</h2>
              <dl className="job-compact-facts">
                <div><dt>{t.employer as string}</dt><dd>{factValue(job.employer_name)}</dd></div>
                <div><dt>{t.location as string}</dt><dd>{isArabic ? job.country.name_ar : job.country.name_en}{job.region ? ` · ${isArabic ? job.region.name_ar : job.region.name_en}` : ""}</dd></div>
                <div><dt>{t.jobType as string}</dt><dd>{(t.types as Record<string, string>)[job.employment_type] || (t.notSpecified as string)}</dd></div>
                <div><dt>{t.workMode as string}</dt><dd>{(t.modes as Record<string, string>)[job.work_mode] || (t.notSpecified as string)}</dd></div>
                <div><dt>{t.salary as string}</dt><dd>{salary}</dd></div>
              </dl>
              <div className="job-apply-routes">
                {job.application_routes.map((route, index) => {
                  const destination = safeDestination(route);
                  if (!destination) return null;
                  return <a className="job-apply-button" key={`${route.route_type}-${index}`} href={destination} target={route.route_type === "EMAIL" ? undefined : "_blank"} rel={route.route_type === "EMAIL" ? undefined : "noopener noreferrer nofollow"}>{applyLabel(route)} ↗</a>;
                })}
              </div>
              <p className="job-apply-note">{isArabic ? "يتم التقديم خارج منصة فرصة. راجع المصدر وتفاصيل الوظيفة قبل مشاركة معلوماتك." : "Applications happen outside FURSA. Review the source and job details before sharing personal information."}</p>
            </aside>
          </div>
        </article>
      ) : null}
    </main>
  );
}
