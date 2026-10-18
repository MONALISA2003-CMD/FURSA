"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Locale = "en" | "ar";
type Country = { code: string; name_en: string; name_ar: string };
type Category = { slug: string; name_en: string; name_ar: string };
type Region = { code: string; name_en: string; name_ar: string; country_code: string };
type Source = { name: string; source_url: string; source_last_checked_at: string | null };
type Job = {
  id: string; title_original: string; title_en: string; title_ar: string; employer_name: string;
  country: Country; region: Region | null; category: Category | null; employment_type: string;
  work_mode: string; published_at: string | null; last_checked_at: string | null; sources: Source[];
};
type PageResult = { count: number; next: string | null; previous: string | null; results: Job[] };

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const copy = {
  en: {
    back: "Back to FURSA", eyebrow: "JOB CATALOGUE", title: "Discover opportunities across the Gulf",
    intro: "Search source-backed job listings. Check the original source and last-checked date before applying.",
    queryLabel: "Job title, skill, or employer", queryPlaceholder: "For example, software engineer",
    countryLabel: "Country", allCountries: "All countries", regionLabel: "Region", allRegions: "All regions", categoryLabel: "Category", allCategories: "All categories",
    workModeLabel: "Work mode", allWorkModes: "All work modes", employmentTypeLabel: "Employment type", allEmploymentTypes: "All types", sortLabel: "Sort by", sortNewest: "Newest", sortChecked: "Last checked",
    search: "Search jobs", loading: "Loading job listings…", failed: "We could not load job listings. Check your connection and try again.",
    retry: "Try again", count: "published listings", emptyTitle: "No published jobs found", emptyText: "Try a different search or check back when new source-reviewed listings are published.",
    employerUnknown: "Employer not specified", lastChecked: "Last checked", published: "Published", viewDetails: "View job details",
    previous: "Previous", next: "Next", workModes: { ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" } as Record<string, string>,
    employmentTypes: { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", TEMPORARY: "Temporary", INTERNSHIP: "Internship", OTHER: "Other" } as Record<string, string>,
  },
  ar: {
    back: "العودة إلى فرصة", eyebrow: "فهرس الوظائف", title: "اكتشف فرص العمل في الخليج",
    intro: "ابحث عن وظائف مرتبطة بمصادر واضحة. راجع المصدر الأصلي وتاريخ آخر مراجعة قبل التقديم.",
    queryLabel: "المسمى الوظيفي أو المهارة أو جهة العمل", queryPlaceholder: "مثال: مهندس برمجيات",
    countryLabel: "الدولة", allCountries: "جميع الدول", regionLabel: "المنطقة", allRegions: "جميع المناطق", categoryLabel: "الفئة", allCategories: "جميع الفئات",
    workModeLabel: "نظام العمل", allWorkModes: "جميع الأنظمة", employmentTypeLabel: "نوع التوظيف", allEmploymentTypes: "جميع الأنواع", sortLabel: "الترتيب", sortNewest: "الأحدث", sortChecked: "آخر مراجعة",
    search: "ابحث عن وظائف", loading: "جارٍ تحميل الوظائف…", failed: "تعذّر تحميل الوظائف. تحقق من الاتصال وحاول مجدداً.",
    retry: "حاول مجدداً", count: "وظيفة منشورة", emptyTitle: "لا توجد وظائف منشورة حالياً", emptyText: "جرّب كلمات أخرى أو عُد لاحقاً عند نشر وظائف جديدة بعد مراجعة مصادرها.",
    employerUnknown: "جهة العمل غير محددة", lastChecked: "آخر مراجعة", published: "تاريخ النشر", viewDetails: "عرض تفاصيل الوظيفة",
    previous: "السابق", next: "التالي", workModes: { ONSITE: "من مقر العمل", HYBRID: "هجين", REMOTE: "عن بُعد" } as Record<string, string>,
    employmentTypes: { FULL_TIME: "دوام كامل", PART_TIME: "دوام جزئي", CONTRACT: "عقد", TEMPORARY: "مؤقت", INTERNSHIP: "تدريب", OTHER: "أخرى" } as Record<string, string>,
  },
} satisfies Record<Locale, Record<string, unknown>>;

function jobTitle(job: Job, locale: Locale) {
  return (locale === "ar" ? job.title_ar : job.title_en) || job.title_original;
}

function dateLabel(value: string | null, locale: Locale) {
  if (!value) return locale === "ar" ? "لم يحدده صاحب العمل" : "Not specified by employer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ar" ? "لم يحدده صاحب العمل" : "Not specified by employer";
  return date.toLocaleDateString(locale === "ar" ? "ar" : "en", { year: "numeric", month: "short", day: "numeric" });
}

export default function JobResults({
  locale,
  initialQuery,
  initialCountry = "",
  initialCategory = "",
}: {
  locale: Locale;
  initialQuery: string;
  initialCountry?: string;
  initialCategory?: string;
}) {
  const t = copy[locale];
  const isArabic = locale === "ar";
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [workMode, setWorkMode] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setDraftQuery(initialQuery);
    setQuery(initialQuery);
    setCountry(initialCountry);
    setCategory(initialCategory);
    setRegion("");
    setPage(1);
  }, [initialQuery, initialCountry, initialCategory]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${API_BASE}/api/v1/countries/`, { signal: controller.signal, cache: "no-store" }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/categories/`, { signal: controller.signal, cache: "no-store" }).then((r) => r.ok ? r.json() : []),
    ]).then(([countryRows, categoryRows]) => {
      setCountries(Array.isArray(countryRows) ? countryRows : []);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
    }).catch(() => {
      // Keep the page usable if reference data is temporarily unavailable.
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const queryParams = new URLSearchParams();
    if (country) queryParams.set("country", country);
    const suffix = queryParams.toString() ? `?${queryParams.toString()}` : "";
    fetch(`${API_BASE}/api/v1/regions/${suffix}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => setRegions(Array.isArray(rows) ? rows : []))
      .catch(() => setRegions([]));
    return () => controller.abort();
  }, [country]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (country) params.set("country", country);
    if (region) params.set("region", region);
    if (category) params.set("category", category);
    if (workMode) params.set("work_mode", workMode);
    if (employmentType) params.set("employment_type", employmentType);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("page_size", "12");
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/v1/jobs/?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load jobs");
        return response.json() as Promise<PageResult>;
      })
      .then((body) => setResult(body))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, country, region, category, workMode, employmentType, sort, page, retryKey]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(draftQuery.slice(0, 160));
  }
  function updateCountry(value: string) { setCountry(value); setRegion(""); setPage(1); }
  function updateRegion(value: string) { setRegion(value); setPage(1); }
  function updateCategory(value: string) { setCategory(value); setPage(1); }
  function updateWorkMode(value: string) { setWorkMode(value); setPage(1); }
  function updateEmploymentType(value: string) { setEmploymentType(value); setPage(1); }
  function updateSort(value: string) { setSort(value); setPage(1); }

  return (
    <main className="job-page" lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <Link href={`/${locale}`} className="back-link">← {t.back as string}</Link>
      <header className="job-page-heading">
        <span className="eyebrow muted-eyebrow">{t.eyebrow as string}</span>
        <h1>{t.title as string}</h1>
        <p>{t.intro as string}</p>
      </header>
      <form className="job-filter-panel" onSubmit={submitSearch}>
        <div className="job-filter-field job-filter-search"><label htmlFor="job-query">{t.queryLabel as string}</label><input id="job-query" type="search" value={draftQuery} maxLength={160} onChange={(event) => setDraftQuery(event.target.value)} placeholder={t.queryPlaceholder as string} /></div>
        <div className="job-filter-field"><label htmlFor="job-country">{t.countryLabel as string}</label><select id="job-country" value={country} onChange={(event) => updateCountry(event.target.value)}><option value="">{t.allCountries as string}</option>{countries.map((row) => <option key={row.code} value={row.code}>{isArabic ? row.name_ar : row.name_en}</option>)}</select></div>
        <div className="job-filter-field"><label htmlFor="job-region">{t.regionLabel as string}</label><select id="job-region" value={region} onChange={(event) => updateRegion(event.target.value)}><option value="">{t.allRegions as string}</option>{regions.map((row) => <option key={`${row.country_code}-${row.code}`} value={row.code}>{isArabic ? row.name_ar : row.name_en}</option>)}</select></div>
        <div className="job-filter-field"><label htmlFor="job-category">{t.categoryLabel as string}</label><select id="job-category" value={category} onChange={(event) => updateCategory(event.target.value)}><option value="">{t.allCategories as string}</option>{categories.map((row) => <option key={row.slug} value={row.slug}>{isArabic ? row.name_ar : row.name_en}</option>)}</select></div>
        <div className="job-filter-field"><label htmlFor="job-work-mode">{t.workModeLabel as string}</label><select id="job-work-mode" value={workMode} onChange={(event) => updateWorkMode(event.target.value)}><option value="">{t.allWorkModes as string}</option><option value="ONSITE">{(t.workModes as Record<string, string>).ONSITE}</option><option value="HYBRID">{(t.workModes as Record<string, string>).HYBRID}</option><option value="REMOTE">{(t.workModes as Record<string, string>).REMOTE}</option></select></div>
        <div className="job-filter-field"><label htmlFor="job-employment-type">{t.employmentTypeLabel as string}</label><select id="job-employment-type" value={employmentType} onChange={(event) => updateEmploymentType(event.target.value)}><option value="">{t.allEmploymentTypes as string}</option>{Object.entries(t.employmentTypes as Record<string, string>).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        <div className="job-filter-field"><label htmlFor="job-sort">{t.sortLabel as string}</label><select id="job-sort" value={sort} onChange={(event) => updateSort(event.target.value)}><option value="newest">{t.sortNewest as string}</option><option value="checked">{t.sortChecked as string}</option></select></div>
        <button type="submit" className="job-search-button">{t.search as string}</button>
      </form>
      <div className="job-results-bar" aria-live="polite">{!loading && !error && result ? <span>{result.count} {t.count as string}</span> : <span />}</div>
      {loading ? <div className="job-state" role="status">{t.loading as string}</div> : null}
      {error ? <div className="job-state job-state-error" role="alert"><p>{t.failed as string}</p><button type="button" className="job-secondary-button" onClick={() => setRetryKey((value) => value + 1)}>{t.retry as string}</button></div> : null}
      {!loading && !error && result && result.results.length === 0 ? <section className="job-state job-empty-state"><span className="job-empty-icon" aria-hidden="true">⌕</span><h2>{t.emptyTitle as string}</h2><p>{t.emptyText as string}</p></section> : null}
      {!loading && !error && result && result.results.length > 0 ? <>
        <div className="job-card-grid">{result.results.map((job) => <article className="job-card" key={job.id}>
          <div className="job-card-topline"><span className="job-country-label">{isArabic ? job.country.name_ar : job.country.name_en}</span>{job.category ? <span className="job-category-label">{isArabic ? job.category.name_ar : job.category.name_en}</span> : null}</div>
          <h2><Link href={`/${locale}/jobs/${job.id}`}>{jobTitle(job, locale)}</Link></h2><p className="job-employer">{job.employer_name || (t.employerUnknown as string)}</p>
          <div className="job-facts">{job.region ? <span>{isArabic ? job.region.name_ar : job.region.name_en}</span> : null}{job.work_mode ? <span>{(t.workModes as Record<string, string>)[job.work_mode] || job.work_mode}</span> : null}{job.employment_type ? <span>{(t.employmentTypes as Record<string, string>)[job.employment_type] || job.employment_type}</span> : null}</div>
          <div className="job-source-line">{job.sources[0] ? <a href={job.sources[0].source_url} target="_blank" rel="noopener noreferrer nofollow">{job.sources[0].name}</a> : null}<span>{t.lastChecked as string}: {dateLabel(job.last_checked_at, locale)}</span></div>
          <Link href={`/${locale}/jobs/${job.id}`} className="job-card-link">{t.viewDetails as string}<span aria-hidden="true">↗</span></Link>
        </article>)}</div>
        <nav className="job-pagination" aria-label={isArabic ? "صفحات النتائج" : "Search result pages"}><button type="button" disabled={!result.previous || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t.previous as string}</button><span>{page}</span><button type="button" disabled={!result.next || loading} onClick={() => setPage((value) => value + 1)}>{t.next as string}</button></nav>
      </> : null}
    </main>
  );
}
