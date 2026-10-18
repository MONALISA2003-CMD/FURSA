"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
type IconName = "search" | "filter" | "arrow" | "external" | "empty" | "close" | "refresh";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const FLAG_SRC: Record<string, string> = { AE: "/flags/ae.svg", SA: "/flags/sa.svg", QA: "/flags/qa.svg", KW: "/flags/kw.svg", BH: "/flags/bh.svg" };
const copy = {
  en: {
    back: "Back to FURSA", eyebrow: "JOB CATALOGUE", title: "Discover opportunities across the Gulf",
    intro: "Search source-backed job listings. Check the original source and last-checked date before applying.",
    queryLabel: "Job title, skill, or employer", queryPlaceholder: "For example, software engineer",
    countryLabel: "Country", allCountries: "All countries", regionLabel: "Region", allRegions: "All regions", categoryLabel: "Category", allCategories: "All categories",
    workModeLabel: "Work mode", allWorkModes: "All work modes", employmentTypeLabel: "Employment type", allEmploymentTypes: "All types", sortLabel: "Sort by", sortNewest: "Newest first", sortChecked: "Recently checked",
    search: "Search jobs", filters: "Filters", closeFilters: "Close filters", applyFilters: "Done · show results", clearAll: "Clear all", clearFilters: "Clear filters", activeFilters: "active", removeFilter: "Remove filter",
    loading: "Loading job listings…", failed: "We could not load job listings. Check your connection and try again.", retry: "Try again",
    countOne: "published listing", countMany: "published listings", emptyTitle: "No published jobs found", emptyText: "There are no published vacancies matching this search. Clear a filter or check back when new source-reviewed listings are published.",
    emptyCatalogTitle: "The catalogue is being prepared", emptyCatalogText: "No vacancies are published yet. We are preparing source-backed listings and will show them here after review.",
    employerUnknown: "Employer not specified", lastChecked: "Last checked", published: "Published on FURSA", dateUnknown: "Not provided", source: "Source", viewDetails: "View job details",
    previous: "Previous", next: "Next", page: "Page", of: "of", countryFlagAlt: "Flag of", noRegions: "No regions are listed for this country yet",
    workModes: { ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" } as Record<string, string>,
    employmentTypes: { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", TEMPORARY: "Temporary", INTERNSHIP: "Internship", OTHER: "Other" } as Record<string, string>,
  },
  ar: {
    back: "العودة إلى فرصة", eyebrow: "فهرس الوظائف", title: "اكتشف فرص العمل في الخليج",
    intro: "ابحث عن وظائف مرتبطة بمصادر واضحة. راجع المصدر الأصلي وتاريخ آخر مراجعة قبل التقديم.",
    queryLabel: "المسمى الوظيفي أو المهارة أو جهة العمل", queryPlaceholder: "مثال: مهندس برمجيات",
    countryLabel: "الدولة", allCountries: "جميع الدول", regionLabel: "المنطقة", allRegions: "جميع المناطق", categoryLabel: "الفئة", allCategories: "جميع الفئات",
    workModeLabel: "نظام العمل", allWorkModes: "جميع الأنظمة", employmentTypeLabel: "نوع التوظيف", allEmploymentTypes: "جميع الأنواع", sortLabel: "الترتيب", sortNewest: "الأحدث أولاً", sortChecked: "الأحدث مراجعة",
    search: "ابحث عن وظائف", filters: "عوامل التصفية", closeFilters: "إغلاق عوامل التصفية", applyFilters: "تم · عرض النتائج", clearAll: "مسح الكل", clearFilters: "مسح عوامل التصفية", activeFilters: "نشطة", removeFilter: "إزالة عامل التصفية",
    loading: "جارٍ تحميل الوظائف…", failed: "تعذّر تحميل الوظائف. تحقق من الاتصال وحاول مجدداً.", retry: "حاول مجدداً",
    countOne: "وظيفة منشورة", countMany: "وظيفة منشورة", emptyTitle: "لا توجد وظائف منشورة تطابق البحث", emptyText: "لا توجد وظائف منشورة تطابق معايير البحث الحالية. امسح أحد عوامل التصفية أو عُد لاحقاً عند نشر وظائف جديدة بعد مراجعة مصادرها.",
    emptyCatalogTitle: "يجري تجهيز فهرس الوظائف", emptyCatalogText: "لم تُنشر وظائف بعد. نعمل على تجهيز إعلانات مرتبطة بمصادر واضحة، وستظهر هنا بعد مراجعتها.",
    employerUnknown: "جهة العمل غير محددة", lastChecked: "آخر مراجعة", published: "تاريخ النشر في فرصة", dateUnknown: "غير متاح", source: "المصدر", viewDetails: "عرض تفاصيل الوظيفة",
    previous: "السابق", next: "التالي", page: "الصفحة", of: "من", countryFlagAlt: "علم", noRegions: "لا توجد مناطق مدرجة لهذه الدولة حتى الآن",
    workModes: { ONSITE: "من مقر العمل", HYBRID: "هجين", REMOTE: "عن بُعد" } as Record<string, string>,
    employmentTypes: { FULL_TIME: "دوام كامل", PART_TIME: "دوام جزئي", CONTRACT: "عقد", TEMPORARY: "مؤقت", INTERNSHIP: "تدريب", OTHER: "أخرى" } as Record<string, string>,
  },
} satisfies Record<Locale, Record<string, unknown>>;

function Icon({ name }: { name: IconName }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, focusable: "false" as const };
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    empty: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4M8 10.5h5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4.7 9a7.5 7.5 0 0 1 12.6-2L20 12M4 17v-5h5" /><path d="M19.3 15a7.5 7.5 0 0 1-12.6 2L4 12" /></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function jobTitle(job: Job, locale: Locale) {
  return (locale === "ar" ? job.title_ar : job.title_en) || job.title_original;
}
function dateLabel(value: string | null, locale: Locale) {
  if (!value) return locale === "ar" ? "غير متاح" : "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ar" ? "غير متاح" : "Not provided";
  return date.toLocaleDateString(locale === "ar" ? "ar" : "en", { year: "numeric", month: "short", day: "numeric" });
}

export default function JobResults({
  locale,
  initialQuery,
  initialCountry = "",
  initialRegion = "",
  initialCategory = "",
  initialWorkMode = "",
  initialEmploymentType = "",
  initialSort = "newest",
  initialPage = 1,
}: {
  locale: Locale;
  initialQuery: string;
  initialCountry?: string;
  initialRegion?: string;
  initialCategory?: string;
  initialWorkMode?: string;
  initialEmploymentType?: string;
  initialSort?: string;
  initialPage?: number;
}) {
  const t = copy[locale];
  const isArabic = locale === "ar";
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(initialRegion);
  const [category, setCategory] = useState(initialCategory);
  const [workMode, setWorkMode] = useState(initialWorkMode);
  const [employmentType, setEmploymentType] = useState(initialEmploymentType);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterToggleRef = useRef<HTMLButtonElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const wasFiltersOpen = useRef(false);

  useEffect(() => {
    setDraftQuery(initialQuery);
    setQuery(initialQuery);
    setCountry(initialCountry);
    setCategory(initialCategory);
    setRegion(initialRegion);
    setWorkMode(initialWorkMode);
    setEmploymentType(initialEmploymentType);
    setSort(initialSort);
    setPage(initialPage);
  }, [initialQuery, initialCountry, initialRegion, initialCategory, initialWorkMode, initialEmploymentType, initialSort, initialPage]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${API_BASE}/api/v1/countries/`, { signal: controller.signal, cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject(new Error("Countries unavailable"))),
      fetch(`${API_BASE}/api/v1/categories/`, { signal: controller.signal, cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject(new Error("Categories unavailable"))),
    ]).then(([countryRows, categoryRows]) => {
      setCountries(Array.isArray(countryRows) ? countryRows : []);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
    }).catch((err: unknown) => {
      if (err instanceof Error && err.name === "AbortError") return;
      setCountries([]);
      setCategories([]);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    fetch(`${API_BASE}/api/v1/regions/${suffix}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Regions unavailable")))
      .then((rows) => setRegions(Array.isArray(rows) ? rows : []))
      .catch((err: unknown) => { if (!(err instanceof Error && err.name === "AbortError")) setRegions([]); });
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
      .then((body) => {
        if (!body || !Array.isArray(body.results) || typeof body.count !== "number") throw new Error("Unexpected job response");
        setResult(body);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, country, region, category, workMode, employmentType, sort, page, retryKey]);

  useEffect(() => {
    if (!filtersOpen) {
      if (wasFiltersOpen.current) filterToggleRef.current?.focus();
      wasFiltersOpen.current = false;
      return;
    }
    wasFiltersOpen.current = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = filterPanelRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusable = () => panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const wideScreen = window.matchMedia("(min-width: 761px)");
    const onBreakpointChange = (event: MediaQueryListEvent) => { if (event.matches) setFiltersOpen(false); };
    wideScreen.addEventListener("change", onBreakpointChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
      wideScreen.removeEventListener("change", onBreakpointChange);
    };
  }, [filtersOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(draftQuery.trim().slice(0, 160));
  }
  function updateCountry(value: string) { setCountry(value); setRegion(""); setPage(1); }
  function updateRegion(value: string) { setRegion(value); setPage(1); }
  function updateCategory(value: string) { setCategory(value); setPage(1); }
  function updateWorkMode(value: string) { setWorkMode(value); setPage(1); }
  function updateEmploymentType(value: string) { setEmploymentType(value); setPage(1); }
  function updateSort(value: string) { setSort(value); setPage(1); }
  function clearFilters() {
    setDraftQuery(""); setQuery(""); setCountry(""); setRegion(""); setCategory(""); setWorkMode(""); setEmploymentType(""); setSort("newest"); setPage(1);
  }

  const activeFilters = useMemo(() => {
    const items: { key: string; label: string; clear: () => void }[] = [];
    if (query.trim()) items.push({ key: "q", label: `${isArabic ? "البحث:" : "Search:"} ${query}`, clear: () => { setQuery(""); setDraftQuery(""); setPage(1); } });
    const countryRow = countries.find((row) => row.code === country);
    if (countryRow) items.push({ key: "country", label: isArabic ? countryRow.name_ar : countryRow.name_en, clear: () => updateCountry("") });
    const regionRow = regions.find((row) => row.code === region);
    if (regionRow) items.push({ key: "region", label: isArabic ? regionRow.name_ar : regionRow.name_en, clear: () => updateRegion("") });
    const categoryRow = categories.find((row) => row.slug === category);
    if (categoryRow) items.push({ key: "category", label: isArabic ? categoryRow.name_ar : categoryRow.name_en, clear: () => updateCategory("") });
    const workModeLabel = (t.workModes as Record<string, string>)[workMode];
    if (workModeLabel) items.push({ key: "workMode", label: workModeLabel, clear: () => updateWorkMode("") });
    const employmentLabel = (t.employmentTypes as Record<string, string>)[employmentType];
    if (employmentLabel) items.push({ key: "employmentType", label: employmentLabel, clear: () => updateEmploymentType("") });
    return items;
  }, [query, isArabic, countries, country, regions, region, categories, category, workMode, employmentType, t.workModes, t.employmentTypes]);

  function jobDetailHref(jobId: string) {
    const returnParams = new URLSearchParams();
    if (query.trim()) returnParams.set("q", query.trim());
    if (country) returnParams.set("country", country);
    if (region) returnParams.set("region", region);
    if (category) returnParams.set("category", category);
    if (workMode) returnParams.set("work_mode", workMode);
    if (employmentType) returnParams.set("employment_type", employmentType);
    if (sort !== "newest") returnParams.set("sort", sort);
    if (page > 1) returnParams.set("page", String(page));
    const returnPath = `/${locale}/jobs${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
    const detailParams = new URLSearchParams({ returnTo: returnPath });
    return `/${locale}/jobs/${encodeURIComponent(jobId)}?${detailParams.toString()}`;
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.count / 12)) : 1;
  const resultCountLabel = result ? `${result.count.toLocaleString(isArabic ? "ar" : "en")} ${isArabic ? String(t.countMany) : result.count === 1 ? String(t.countOne) : String(t.countMany)}` : "";
  const selectedCountry = countries.find((row) => row.code === country);
  const isEmptyCatalog = !!result && result.count === 0 && !query.trim() && !country && !region && !category && !workMode && !employmentType;

  function renderField(id: string, label: string, child: ReactNode) {
    return <div className="job-filter-field" key={id}><label htmlFor={id}>{label}</label>{child}</div>;
  }

  const advancedFilters = (
    <div className="job-advanced-filters">
      {renderField("job-region", String(t.regionLabel), <select id="job-region" value={region} onChange={(event) => updateRegion(event.target.value)} disabled={!country || regions.length === 0}>
        <option value="">{t.allRegions as string}</option>
        {regions.map((row) => <option key={`${row.country_code}-${row.code}`} value={row.code}>{isArabic ? row.name_ar : row.name_en}</option>)}
      </select>)}
      {renderField("job-category", String(t.categoryLabel), <select id="job-category" value={category} onChange={(event) => updateCategory(event.target.value)}>
        <option value="">{t.allCategories as string}</option>{categories.map((row) => <option key={row.slug} value={row.slug}>{isArabic ? row.name_ar : row.name_en}</option>)}
      </select>)}
      {renderField("job-work-mode", String(t.workModeLabel), <select id="job-work-mode" value={workMode} onChange={(event) => updateWorkMode(event.target.value)}>
        <option value="">{t.allWorkModes as string}</option><option value="ONSITE">{(t.workModes as Record<string, string>).ONSITE}</option><option value="HYBRID">{(t.workModes as Record<string, string>).HYBRID}</option><option value="REMOTE">{(t.workModes as Record<string, string>).REMOTE}</option>
      </select>)}
      {renderField("job-employment-type", String(t.employmentTypeLabel), <select id="job-employment-type" value={employmentType} onChange={(event) => updateEmploymentType(event.target.value)}>
        <option value="">{t.allEmploymentTypes as string}</option>{Object.entries(t.employmentTypes as Record<string, string>).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>)}
      {renderField("job-sort", String(t.sortLabel), <select id="job-sort" value={sort} onChange={(event) => updateSort(event.target.value)}>
        <option value="newest">{t.sortNewest as string}</option><option value="checked">{t.sortChecked as string}</option>
      </select>)}
      <div className="job-filter-actions">
        <button type="button" className="job-clear-button" onClick={clearFilters}>{t.clearAll as string}</button>
        <button type="button" className="job-filter-done" onClick={() => setFiltersOpen(false)}>{t.applyFilters as string}</button>
      </div>
    </div>
  );

  return (
    <main className="job-page job-results-page" lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <Link href={`/${locale}`} className="job-back-link"><Icon name="arrow" /><span>{t.back as string}</span></Link>
      <header className="job-page-heading">
        <span className="job-eyebrow">{t.eyebrow as string}</span>
        <h1>{t.title as string}</h1>
        <p>{t.intro as string}</p>
      </header>

      <form className="job-filter-panel" onSubmit={submitSearch}>
        <div className="job-primary-filters">
          {renderField("job-query", String(t.queryLabel), <input id="job-query" type="search" value={draftQuery} maxLength={160} onChange={(event) => setDraftQuery(event.target.value)} placeholder={t.queryPlaceholder as string} />)}
          {renderField("job-country", String(t.countryLabel), <select id="job-country" value={country} onChange={(event) => updateCountry(event.target.value)}>
            <option value="">{t.allCountries as string}</option>{countries.map((row) => <option key={row.code} value={row.code}>{isArabic ? row.name_ar : row.name_en}</option>)}
          </select>)}
          <button ref={filterToggleRef} type="button" className="job-mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="job-advanced-filters" onClick={() => setFiltersOpen((open) => !open)}>
            <Icon name={filtersOpen ? "close" : "filter"} />{t.filters as string}{activeFilters.length ? <span className="job-filter-count">{activeFilters.length}</span> : null}
          </button>
          <button type="submit" className="job-search-button"><Icon name="search" />{t.search as string}</button>
        </div>
        <div ref={filterPanelRef} id="job-advanced-filters" className={`job-advanced-filter-wrap ${filtersOpen ? "is-open" : ""}`} role={filtersOpen ? "dialog" : undefined} aria-modal={filtersOpen ? true : undefined} aria-label={filtersOpen ? String(t.filters) : undefined}>
          <div className="job-advanced-filter-heading"><strong>{t.filters as string}</strong><button type="button" className="job-filter-close" aria-label={t.closeFilters as string} onClick={() => setFiltersOpen(false)}><Icon name="close" /></button></div>
          {advancedFilters}
        </div>
      </form>

      {filtersOpen ? <button type="button" className="job-filter-backdrop" aria-label={t.closeFilters as string} onClick={() => setFiltersOpen(false)} /> : null}

      {activeFilters.length > 0 ? <div className="job-active-filter-row" aria-label={isArabic ? "عوامل التصفية المختارة" : "Selected filters"}>
        <div className="job-active-chips">{activeFilters.map((item) => <button type="button" className="job-filter-chip" key={item.key} onClick={item.clear} aria-label={`${t.removeFilter as string}: ${item.label}`}><span>{item.label}</span><Icon name="close" /></button>)}</div>
        <button type="button" className="job-clear-inline" onClick={clearFilters}>{t.clearFilters as string}</button>
      </div> : null}

      <div className="job-results-toolbar" aria-live="polite">
        <div><span className="job-result-kicker">{t.eyebrow as string}</span><strong>{loading ? (t.loading as string) : error ? "" : resultCountLabel}</strong></div>
        {selectedCountry ? <span className="job-selected-country">{FLAG_SRC[selectedCountry.code] ? <img src={FLAG_SRC[selectedCountry.code]} alt="" width="30" height="20" /> : null}{isArabic ? selectedCountry.name_ar : selectedCountry.name_en}</span> : null}
      </div>

      {loading ? <div className="job-skeleton-grid" role="status" aria-label={t.loading as string}><div className="job-card-skeleton" /><div className="job-card-skeleton" /><div className="job-card-skeleton" /><div className="job-card-skeleton" /></div> : null}
      {error ? <div className="job-state job-state-error" role="alert"><span className="job-state-icon"><Icon name="refresh" /></span><h2>{t.failed as string}</h2><button type="button" className="job-secondary-button" onClick={() => setRetryKey((value) => value + 1)}><Icon name="refresh" />{t.retry as string}</button></div> : null}
      {!loading && !error && result && result.results.length === 0 ? <section className="job-state job-empty-state" aria-labelledby="job-empty-title">
        <span className="job-empty-icon" aria-hidden="true"><Icon name="empty" /></span>
        <h2 id="job-empty-title">{isEmptyCatalog ? t.emptyCatalogTitle as string : t.emptyTitle as string}</h2>
        <p>{isEmptyCatalog ? t.emptyCatalogText as string : t.emptyText as string}</p>
        {activeFilters.length > 0 ? <button type="button" className="job-secondary-button" onClick={clearFilters}>{t.clearAll as string}<Icon name="close" /></button> : null}
        <Link href={`/${locale}`} className="job-browse-link"><Icon name="arrow" />{t.back as string}</Link>
      </section> : null}
      {!loading && !error && result && result.results.length > 0 ? <>
        <div className="job-card-grid">{result.results.map((job) => {
          const source = job.sources?.[0];
          const safeSource = source?.source_url && /^https:\/\//i.test(source.source_url) ? source.source_url : null;
          return <article className="job-card" key={job.id}>
            <div className="job-card-topline">
              <span className="job-country-label">{FLAG_SRC[job.country.code] ? <img src={FLAG_SRC[job.country.code]} alt="" width="27" height="18" loading="lazy" /> : null}{isArabic ? job.country.name_ar : job.country.name_en}</span>
              {job.category ? <span className="job-category-label">{isArabic ? job.category.name_ar : job.category.name_en}</span> : null}
            </div>
            <h2><Link href={jobDetailHref(job.id)}>{jobTitle(job, locale)}</Link></h2>
            <p className="job-employer">{job.employer_name || (t.employerUnknown as string)}</p>
            <div className="job-facts">
              {job.region ? <span>{isArabic ? job.region.name_ar : job.region.name_en}</span> : null}
              {job.work_mode ? <span>{(t.workModes as Record<string, string>)[job.work_mode] || job.work_mode}</span> : null}
              {job.employment_type ? <span>{(t.employmentTypes as Record<string, string>)[job.employment_type] || job.employment_type}</span> : null}
            </div>
            <div className="job-card-meta">
              <div><span>{t.published as string}</span><strong>{dateLabel(job.published_at, locale)}</strong></div>
              <div><span>{t.lastChecked as string}</span><strong>{dateLabel(job.last_checked_at, locale)}</strong></div>
            </div>
            <div className="job-source-line">
              {safeSource ? <a href={safeSource} target="_blank" rel="noopener noreferrer nofollow"><span>{t.source as string}: {source?.name}</span><Icon name="external" /></a> : <span>{t.source as string}: {isArabic ? "غير متاح" : "Not provided"}</span>}
            </div>
            <Link href={jobDetailHref(job.id)} className="job-card-link">{t.viewDetails as string}<Icon name="arrow" /></Link>
          </article>;
        })}</div>
        <nav className="job-pagination" aria-label={isArabic ? "صفحات النتائج" : "Search result pages"}>
          <button type="button" disabled={!result.previous || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><Icon name="arrow" />{t.previous as string}</button>
          <span>{t.page as string} {page.toLocaleString(isArabic ? "ar" : "en")} {t.of as string} {totalPages.toLocaleString(isArabic ? "ar" : "en")}</span>
          <button type="button" disabled={!result.next || loading} onClick={() => setPage((value) => value + 1)}>{t.next as string}<Icon name="arrow" /></button>
        </nav>
      </> : null}
    </main>
  );
}
