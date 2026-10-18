"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

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
type IconName = "arrow" | "external" | "clock" | "refresh" | "briefcase" | "location" | "calendar";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const FLAG_SRC: Record<string, string> = { AE: "/flags/ae.svg", SA: "/flags/sa.svg", QA: "/flags/qa.svg", KW: "/flags/kw.svg", BH: "/flags/bh.svg" };
const copy = {
  en: {
    back: "Back to job search", loading: "Loading job details…", errorTitle: "This job is not available",
    error: "We could not load this vacancy. It may have been withdrawn, expired, or temporarily unavailable.", retry: "Try again",
    employer: "Employer", location: "Location", category: "Category", workMode: "Work mode", jobType: "Employment type",
    salary: "Salary", eligibility: "Eligibility and sponsorship", description: "Job description", source: "Original source",
    sourceLink: "Open original source", sourceUnavailable: "Source link is not available.", sourceCheck: "Source last checked",
    published: "Published on FURSA", originalDate: "Original posting date", lastChecked: "Last checked", deadline: "Application deadline",
    notSpecified: "Not specified by employer", dateUnknown: "Not provided", applyTitle: "How to apply", applyNote: "Applications are completed outside FURSA. Check the source and job details before sharing personal information.",
    applyWebsite: "Apply on employer website", applyEmail: "Apply by email", applyWhatsApp: "Continue to WhatsApp", noRoute: "An application route is not available for this listing. Check the original source for instructions.",
    sponsorship: { OFFERED: "Offered", NOT_OFFERED: "Not offered", NOT_SPECIFIED: "Not specified" } as Record<string, string>,
    types: { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", TEMPORARY: "Temporary", INTERNSHIP: "Internship", OTHER: "Other" } as Record<string, string>,
    modes: { ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" } as Record<string, string>,
    periods: { HOURLY: "per hour", DAILY: "per day", MONTHLY: "per month", ANNUAL: "per year", OTHER: "" } as Record<string, string>,
    from: "From", upTo: "Up to", salaryPeriodUnknown: "", sourceAndFreshness: "Source and freshness", originalNotice: "FURSA links to the original source. A working link does not by itself guarantee that a vacancy is genuine or still available.",
  },
  ar: {
    back: "العودة إلى البحث", loading: "جارٍ تحميل تفاصيل الوظيفة…", errorTitle: "الوظيفة غير متاحة",
    error: "تعذّر تحميل هذه الوظيفة. ربما تم سحب الإعلان أو انتهت صلاحيته أو أن الخدمة غير متاحة مؤقتاً.", retry: "حاول مجدداً",
    employer: "جهة العمل", location: "الموقع", category: "الفئة", workMode: "نظام العمل", jobType: "نوع التوظيف",
    salary: "الراتب", eligibility: "الأهلية والكفالة", description: "وصف الوظيفة", source: "المصدر الأصلي",
    sourceLink: "افتح المصدر الأصلي", sourceUnavailable: "رابط المصدر غير متاح.", sourceCheck: "آخر مراجعة للمصدر",
    published: "تاريخ النشر في فرصة", originalDate: "تاريخ النشر الأصلي", lastChecked: "آخر مراجعة", deadline: "موعد التقديم النهائي",
    notSpecified: "لم يحدده صاحب العمل", dateUnknown: "غير متاح", applyTitle: "طريقة التقديم", applyNote: "يتم التقديم خارج منصة فرصة. راجع المصدر وتفاصيل الوظيفة قبل مشاركة معلوماتك الشخصية.",
    applyWebsite: "التقديم عبر موقع جهة العمل", applyEmail: "التقديم عبر البريد الإلكتروني", applyWhatsApp: "المتابعة عبر واتساب", noRoute: "لا تتوفر قناة تقديم لهذا الإعلان. راجع المصدر الأصلي لمعرفة التعليمات.",
    sponsorship: { OFFERED: "متاح", NOT_OFFERED: "غير متاح", NOT_SPECIFIED: "غير محدد" } as Record<string, string>,
    types: { FULL_TIME: "دوام كامل", PART_TIME: "دوام جزئي", CONTRACT: "عقد", TEMPORARY: "مؤقت", INTERNSHIP: "تدريب", OTHER: "أخرى" } as Record<string, string>,
    modes: { ONSITE: "من مقر العمل", HYBRID: "هجين", REMOTE: "عن بُعد" } as Record<string, string>,
    periods: { HOURLY: "في الساعة", DAILY: "في اليوم", MONTHLY: "شهرياً", ANNUAL: "سنوياً", OTHER: "" } as Record<string, string>,
    from: "ابتداءً من", upTo: "حتى", salaryPeriodUnknown: "", sourceAndFreshness: "المصدر وحداثة المعلومات", originalNotice: "تربط فرصة بالمصدر الأصلي. ولا يعني عمل الرابط وحده أن الوظيفة حقيقية أو ما زالت متاحة.",
  },
} satisfies Record<Locale, Record<string, unknown>>;

function Icon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, focusable: "false" as const, "aria-hidden": true as const };
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4.7 9a7.5 7.5 0 0 1 12.6-2L20 12M4 17v-5h5" /><path d="M19.3 15a7.5 7.5 0 0 1-12.6 2L4 12" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function dateLabel(value: string | null, locale: Locale) {
  if (!value) return locale === "ar" ? "غير متاح" : "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ar" ? "غير متاح" : "Not provided";
  return date.toLocaleDateString(locale === "ar" ? "ar" : "en", { year: "numeric", month: "short", day: "numeric" });
}

function safeDestination(route: ApplyRoute): string | null {
  if (!route || typeof route.destination !== "string") return null;
  const destination = route.destination.trim();
  if (route.route_type === "EMAIL") {
    if (!/^mailto:[^\s/?#]+@[^\s/?#]+\.[^\s/?#]+(?:\?[^\s#]*)?$/i.test(destination)) return null;
    return destination;
  }
  try {
    const url = new URL(destination);
    if (url.protocol !== "https:") return null;
    if (route.route_type === "WHATSAPP" && !["wa.me", "api.whatsapp.com"].includes(url.hostname.toLowerCase())) return null;
    if (route.route_type !== "WEBSITE" && route.route_type !== "WHATSAPP") return null;
    return url.toString();
  } catch { return null; }
}

function titleFor(job: Job, locale: Locale) {
  return (locale === "ar" ? job.title_ar : job.title_en) || job.title_original;
}
function salaryFor(job: Job, locale: Locale) {
  if (!job.salary_min && !job.salary_max) return locale === "ar" ? "لم يحدده صاحب العمل" : "Not specified by employer";
  const t = copy[locale];
  const low = job.salary_min;
  const high = job.salary_max;
  let range = "";
  if (low && high) range = low === high ? low : `${low}–${high}`;
  else if (low) range = `${t.from as string} ${low}`;
  else range = `${t.upTo as string} ${high}`;
  const parts = [range, job.salary_currency, (t.periods as Record<string, string>)[job.salary_period] || ""].filter(Boolean);
  return parts.join(" ");
}

export default function JobDetailClient({ locale, id, backHref }: { locale: Locale; id: string; backHref: string }) {
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
      .then((body) => {
        if (!body || typeof body.id !== "string" || !body.country) throw new Error("Unexpected job response");
        setJob(body);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retryKey]);

  function applyLabel(route: ApplyRoute) {
    if (route.route_type === "EMAIL") return t.applyEmail as string;
    if (route.route_type === "WHATSAPP") return t.applyWhatsApp as string;
    return t.applyWebsite as string;
  }
  function factValue(value: string | null | undefined) { return value?.trim() || (t.notSpecified as string); }

  const descriptions = job ? ((isArabic ? job.description_ar : job.description_en) || job.description_original) : "";
  const salary = job ? salaryFor(job, locale) : "";
  const availableRoutes: Array<{ route: ApplyRoute; index: number; destination: string }> = (job?.application_routes || []).flatMap((route, index) => {
    const destination = safeDestination(route);
    return destination ? [{ route, index, destination }] : [];
  });
  const countryName = job ? (isArabic ? job.country.name_ar : job.country.name_en) : "";
  const regionName = job?.region ? (isArabic ? job.region.name_ar : job.region.name_en) : "";
  const categoryName = job?.category ? (isArabic ? job.category.name_ar : job.category.name_en) : "";
  const sourceList = (job?.sources || []).filter((source) => typeof source.source_url === "string" && /^https:\/\//i.test(source.source_url.trim()));

  function renderDate(label: string, value: string | null, icon: IconName = "calendar") {
    return <div className="job-meta-item" key={label}><dt><Icon name={icon} />{label}</dt><dd>{dateLabel(value, locale)}</dd></div>;
  }

  return (
    <main className="job-page job-detail-page" lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <Link href={backHref} className="job-back-link"><Icon name="arrow" /><span>{t.back as string}</span></Link>
      {loading ? <div className="job-state" role="status"><span className="job-state-icon"><Icon name="clock" /></span><h2>{t.loading as string}</h2></div> : null}
      {error ? <div className="job-state job-state-error" role="alert"><span className="job-state-icon"><Icon name="refresh" /></span><h2>{t.errorTitle as string}</h2><p>{t.error as string}</p><button type="button" className="job-secondary-button" onClick={() => setRetryKey((value) => value + 1)}><Icon name="refresh" />{t.retry as string}</button></div> : null}
      {!loading && !error && job ? (
        <article>
          <header className="job-detail-header">
            <div className="job-detail-topline">
              <span className="job-country-label">{FLAG_SRC[job.country.code] ? <img src={FLAG_SRC[job.country.code]} alt="" width="29" height="20" /> : null}{countryName}</span>
              {categoryName ? <span className="job-detail-category">{categoryName}</span> : null}
            </div>
            <h1>{titleFor(job, locale)}</h1>
            <p className="job-employer">{job.employer_name || (t.notSpecified as string)}</p>
            <div className="job-facts">
              {regionName ? <span><Icon name="location" />{regionName}</span> : null}
              {job.employment_type ? <span><Icon name="briefcase" />{(t.types as Record<string, string>)[job.employment_type] || job.employment_type}</span> : null}
              {job.work_mode ? <span>{(t.modes as Record<string, string>)[job.work_mode] || job.work_mode}</span> : null}
            </div>
            <dl className="job-meta-grid">
              {renderDate(t.published as string, job.published_at)}
              {renderDate(t.originalDate as string, job.original_posted_at)}
              {renderDate(t.lastChecked as string, job.last_checked_at, "clock")}
              {renderDate(t.deadline as string, job.deadline_at, "clock")}
            </dl>
          </header>

          <div className="job-detail-columns">
            <div className="job-detail-main">
              <section className="job-detail-section">
                <h2>{t.description as string}</h2>
                {descriptions ? <p className="job-description-text">{descriptions}</p> : <p className="job-eligibility-note">{t.notSpecified as string}</p>}
              </section>
              <section className="job-detail-section">
                <h2>{t.eligibility as string}</h2>
                <p className="job-eligibility-note">{factValue(job.eligibility_text)}</p>
                <p className="job-eligibility-note"><strong>{isArabic ? "حالة الكفالة:" : "Sponsorship status:"}</strong> {(t.sponsorship as Record<string, string>)[job.sponsorship_status] || (t.notSpecified as string)}</p>
              </section>
              <section className="job-detail-section">
                <h2><Icon name="external" />{t.sourceAndFreshness as string}</h2>
                {sourceList.length ? sourceList.map((source, index) => (
                  <div className="job-source-card" key={`${source.source_url}-${index}`}>
                    <strong>{source.name || (t.source as string)}</strong>
                    <p>{t.sourceCheck as string}: {dateLabel(source.source_last_checked_at, locale)}</p>
                    <a href={source.source_url.trim()} target="_blank" rel="noopener noreferrer nofollow">{t.sourceLink as string}<Icon name="external" /></a>
                  </div>
                )) : <p className="job-eligibility-note">{t.sourceUnavailable as string}</p>}
                <p className="job-source-note">{t.originalNotice as string}</p>
              </section>
            </div>
            <aside className="job-detail-aside" aria-labelledby="job-apply-heading">
              <h2 id="job-apply-heading">{t.applyTitle as string}</h2>
              <dl className="job-compact-facts">
                <div><dt>{t.employer as string}</dt><dd>{factValue(job.employer_name)}</dd></div>
                <div><dt>{t.location as string}</dt><dd>{countryName}{regionName ? ` · ${regionName}` : ""}</dd></div>
                <div><dt>{t.jobType as string}</dt><dd>{(t.types as Record<string, string>)[job.employment_type] || (t.notSpecified as string)}</dd></div>
                <div><dt>{t.workMode as string}</dt><dd>{(t.modes as Record<string, string>)[job.work_mode] || (t.notSpecified as string)}</dd></div>
                <div><dt>{t.salary as string}</dt><dd dir="auto">{salary}</dd></div>
              </dl>
              {availableRoutes.length ? <div className="job-apply-routes">
                {availableRoutes.map(({ route, index, destination }) => <a className="job-apply-button" key={`${route.route_type}-${index}`} href={destination || undefined} target={route.route_type === "EMAIL" ? undefined : "_blank"} rel={route.route_type === "EMAIL" ? undefined : "noopener noreferrer nofollow"}>
                  <span>{applyLabel(route)}</span>{route.route_type === "EMAIL" ? null : <Icon name="external" />}
                </a>)}
              </div> : <p className="job-no-route">{t.noRoute as string}</p>}
              <p className="job-apply-note">{t.applyNote as string}</p>
            </aside>
          </div>
        </article>
      ) : null}
    </main>
  );
}
