"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Locale = "en" | "ar";
type Country = { code: string; name_en: string; name_ar: string };
type Category = { slug: string; name_en: string; name_ar: string };
type ReferenceStatus = "loading" | "ready" | "error";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const LOCAL_FLAG_CODES = new Set(["AE", "SA", "QA", "KW", "BH"]);

const copy = {
  en: {
    kicker: "FURSA · فرصة · JOB DISCOVERY ACROSS THE GULF",
    headline: "Find your next opportunity across the Gulf.",
    intro: "Explore job opportunities in one clear place. Understand the source, check the details, and continue to the original application route.",
    queryLabel: "What role are you looking for?",
    queryPlaceholder: "Job title, skill, or employer",
    countryLabel: "Choose a country",
    allCountries: "All five countries",
    countriesLoading: "Loading countries…",
    countriesUnavailable: "Countries temporarily unavailable",
    search: "Search jobs",
    free: "Free to browse",
    noAccount: "No job-seeker account required",
    sourceFirst: "Source-led information",
    countriesEyebrow: "START WITH A PLACE",
    countriesTitle: "Explore jobs by country",
    countriesIntro: "Start with the Gulf country that interests you. Refine your search by region or job category when you browse the catalogue.",
    categoriesEyebrow: "EXPLORE YOUR FIELD",
    categoriesTitle: "Browse by job category",
    categoriesIntro: "Explore job fields that match your skills and interests. Available vacancies appear only when they have been added to the catalogue.",
    aboutEyebrow: "MADE FOR CLARITY",
    aboutTitle: "A more straightforward way to discover work.",
    aboutText: "FURSA brings job information into one searchable catalogue. We show the available source and relevant dates, make unknown details clear, and direct applications to the original employer or authorised source. FURSA is a discovery service, not the employer.",
    trustCardTitle: "What to look for in a listing",
    trustOne: "Check the source",
    trustOneText: "Open the original information and check who published it.",
    trustTwo: "Check the dates",
    trustTwoText: "Original publication and last-checked dates serve different purposes.",
    trustThree: "Apply at the source",
    trustThreeText: "Applications are completed externally, not inside FURSA.",
    catalogueEyebrow: "A CAREFULLY MAINTAINED CATALOGUE",
    catalogueTitle: "Useful information before you take the next step.",
    catalogueText: "We are preparing the catalogue and its review process. We will not fill the page with made-up listings. Vacancies should be presented with their available source and application information.",
    browseJobs: "Browse the job catalogue",
    safetyTitle: "Stay thoughtful when applying",
    safetyText: "Never pay to secure a job or interview. Check the employer and application destination, be cautious with personal documents, and report a listing that appears suspicious or out of date.",
    loadingReferences: "Loading countries and job categories…",
    referenceError: "We couldn't load the country and category lists. Check your connection and retry.",
    noCountries: "Country browsing is temporarily unavailable.",
    noCategories: "Category browsing is temporarily unavailable.",
    retry: "Try again",
    categoryEmpty: "No categories are currently available.",
    countryEmpty: "No countries are currently available.",
  },
  ar: {
    kicker: "فرصة · FURSA · اكتشاف الوظائف في الخليج",
    headline: "اكتشف فرصتك القادمة في الخليج.",
    intro: "اكتشف فرص العمل من مكان واحد وبطريقة واضحة. راجع المصدر والتفاصيل، ثم انتقل إلى قناة التقديم الأصلية.",
    queryLabel: "ما الوظيفة التي تبحث عنها؟",
    queryPlaceholder: "المسمى الوظيفي أو المهارة أو جهة العمل",
    countryLabel: "اختر الدولة",
    allCountries: "جميع الدول الخمس",
    countriesLoading: "جارٍ تحميل الدول…",
    countriesUnavailable: "قائمة الدول غير متاحة مؤقتاً",
    search: "ابحث عن وظائف",
    free: "التصفح مجاني",
    noAccount: "لا حاجة إلى حساب للباحثين عن عمل",
    sourceFirst: "المصدر أساس المعلومات",
    countriesEyebrow: "ابدأ باختيار المكان",
    countriesTitle: "اكتشف الوظائف حسب الدولة",
    countriesIntro: "ابدأ بالدولة الخليجية التي تهمك، ثم حدّد المنطقة أو فئة الوظيفة عند تصفّح الفهرس.",
    categoriesEyebrow: "اكتشف مجال عملك",
    categoriesTitle: "تصفّح حسب فئة الوظيفة",
    categoriesIntro: "استكشف المجالات المهنية التي تناسب مهاراتك واهتماماتك. لن تظهر الوظائف إلا بعد إضافتها إلى الفهرس.",
    aboutEyebrow: "وضوح في كل خطوة",
    aboutTitle: "طريقة أوضح لاكتشاف فرص العمل.",
    aboutText: "تجمع فرصة معلومات الوظائف في فهرس قابل للبحث. نعرض المصادر والتواريخ المتاحة ونوضح المعلومات غير المحددة، ثم نوجّه التقديم إلى جهة العمل أو المصدر المعتمد. فرصة منصة لاكتشاف الوظائف وليست جهة توظيف.",
    trustCardTitle: "ما الذي ينبغي مراجعته؟",
    trustOne: "راجع المصدر",
    trustOneText: "افتح المعلومات الأصلية وتحقق من الجهة التي نشرتها.",
    trustTwo: "راجع التواريخ",
    trustTwoText: "تاريخ النشر الأصلي وتاريخ آخر مراجعة لهما معنيان مختلفان.",
    trustThree: "قدّم عبر المصدر",
    trustThreeText: "يتم التقديم خارج منصة فرصة، وليس داخلها.",
    catalogueEyebrow: "فهرس تتم صيانته بعناية",
    catalogueTitle: "معلومات واضحة قبل اتخاذ الخطوة التالية.",
    catalogueText: "نعمل على تجهيز فهرس الوظائف وآلية مراجعته. لن نملأ الصفحة بإعلانات غير حقيقية، وسنعرض معلومات المصدر والتقديم المتاحة لكل وظيفة.",
    browseJobs: "تصفّح فهرس الوظائف",
    safetyTitle: "تحقّق قبل التقديم",
    safetyText: "لا تدفع المال للحصول على وظيفة أو مقابلة. تحقق من جهة العمل ورابط التقديم، وتعامل بحذر مع مستنداتك الشخصية، وأبلغ عن أي إعلان يبدو مشبوهاً أو قديماً.",
    loadingReferences: "جارٍ تحميل الدول وفئات الوظائف…",
    referenceError: "تعذّر تحميل قوائم الدول والفئات. تحقق من الاتصال ثم حاول مجدداً.",
    noCountries: "تصفّح الدول غير متاح مؤقتاً.",
    noCategories: "تصفّح الفئات غير متاح مؤقتاً.",
    retry: "حاول مجدداً",
    categoryEmpty: "لا توجد فئات متاحة حالياً.",
    countryEmpty: "لا توجد دول متاحة حالياً.",
  },
} satisfies Record<Locale, Record<string, string>>;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="10.8" cy="10.8" r="6.5" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

function CategoryIcon({ slug }: { slug: string }) {
  const paths: Record<string, ReactNode> = {
    administration: <><rect x="5" y="4.5" width="14" height="16" rx="2" /><path d="M9 4.5v-1h6v1M8 10h8M8 14h8M8 18h5" /></>,
    construction: <><path d="M3 14a9 9 0 0 1 18 0M2.5 14h19M12 5v9M5.5 8.5l2 2M18.5 8.5l-2 2" /><path d="M6 17h12" /></>,
    "customer-service": <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="12" width="4" height="7" rx="2" /><rect x="17" y="12" width="4" height="7" rx="2" /><path d="M17 19a5 5 0 0 1-5 3h-1" /></>,
    engineering: <><circle cx="12" cy="12" r="3.2" /><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.8-.7a8 8 0 0 1-1.8 1l-.3 1.9h-3l-.4-1.9a8 8 0 0 1-1.8-1l-1.8.7L7 16.2l1.5-1.2a7 7 0 0 1 0-2l-1.5-1.2 1.5-2.6 1.8.7a8 8 0 0 1 1.8-1l.4-1.9h3l.3 1.9a8 8 0 0 1 1.8 1l1.8-.7 1.5 2.6-1.4 1.2a7 7 0 0 1-.1 2Z" transform="translate(-1 -1) scale(1.08)" /></>,
    "finance-accounting": <><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8.5 6.5h7M8 11h2M14 11h2M8 15h2M14 15h2M8 18.5h2M14 18.5h2" /></>,
    healthcare: <><path d="M6 3v5a6 6 0 0 0 12 0V3M4 3h4M16 3h4M12 14v3a4 4 0 0 0 8 0v-1" /><circle cx="20" cy="14" r="1.5" /></>,
    hospitality: <><path d="M4 21V4h12v17M16 10h4v11M8 8h4M8 12h4M8 16h4M18 14h.1M18 17h.1M2 21h20" /></>,
    "it-software": <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
    "logistics-warehouse": <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" /></>,
    "sales-marketing": <><path d="M3 10v4h4l10 5V5L7 10H3Z" /><path d="m7 14 2 6h4l-2.5-4.8M20 9l2-2M20 15l2 2M21 12h2" /></>,
    "skilled-trades": <><path d="m14.5 6.5 3-3a5 5 0 0 0-6.8 6.8L4 17a2.1 2.1 0 0 0 3 3l6.7-6.7a5 5 0 0 0 6.8-6.8l-3 3-3-3Z" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[slug] ?? <><circle cx="12" cy="12" r="8" /><path d="M8 12h8M12 8v8" /></>}</svg>;
}

function LoadingCards({ count, category = false }: { count: number; category?: boolean }) {
  return (
    <div className={category ? "fursa-category-grid fursa-loading-grid" : "fursa-country-grid fursa-loading-grid"} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <div className={category ? "fursa-category-skeleton" : "fursa-country-skeleton"} key={index} />)}
    </div>
  );
}

export default function HomeContent({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const isArabic = locale === "ar";
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [referenceStatus, setReferenceStatus] = useState<ReferenceStatus>("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadReferenceData() {
      try {
        const [countryResponse, categoryResponse] = await Promise.all([
          fetch(`${API_BASE}/api/v1/countries/`, { signal: controller.signal, cache: "no-store" }),
          fetch(`${API_BASE}/api/v1/categories/`, { signal: controller.signal, cache: "no-store" }),
        ]);
        if (!countryResponse.ok || !categoryResponse.ok) throw new Error("Reference-data request failed.");
        const countryData: unknown = await countryResponse.json();
        const categoryData: unknown = await categoryResponse.json();
        if (!Array.isArray(countryData) || !Array.isArray(categoryData)) throw new Error("Reference-data response was not a list.");
        const validCountries = (countryData as Country[]).filter((item) => item && typeof item.code === "string" && typeof item.name_en === "string" && typeof item.name_ar === "string");
        const validCategories = (categoryData as Category[]).filter((item) => item && typeof item.slug === "string" && typeof item.name_en === "string" && typeof item.name_ar === "string");
        setCountries(validCountries);
        setCategories(validCategories);
        setReferenceStatus("ready");
      } catch {
        if (controller.signal.aborted) return;
        setReferenceStatus("error");
      }
    }
    void loadReferenceData();
    return () => controller.abort();
  }, [retryKey]);

  const retryReferenceData = () => {
    setReferenceStatus("loading");
    setRetryKey((value) => value + 1);
  };

  const referenceError = (
    <div className="fursa-reference-error" role="status" aria-live="polite">
      <p>{t.referenceError}</p>
      <button type="button" onClick={retryReferenceData} className="fursa-retry-button">{t.retry}</button>
    </div>
  );

  return (
    <main className="fursa-home" lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <section className="fursa-hero" aria-labelledby="fursa-home-title">
        <div className="fursa-hero-inner">
          <div className="fursa-hero-copy">
            <div className="fursa-kicker"><span className="fursa-kicker-dot" aria-hidden="true" />{t.kicker}</div>
            <h1 id="fursa-home-title">{t.headline}</h1>
            <p className="fursa-hero-lead">{t.intro}</p>
            <form action={`/${locale}/jobs`} method="get" className="fursa-search-box" role="search">
              <div className="fursa-search-grid">
                <div className="fursa-search-field">
                  <label htmlFor="fursa-job-query">{t.queryLabel}</label>
                  <input id="fursa-job-query" type="search" name="q" maxLength={160} placeholder={t.queryPlaceholder} />
                </div>
                <div className="fursa-search-field">
                  <label htmlFor="fursa-job-country">{t.countryLabel}</label>
                  <select id="fursa-job-country" name="country" defaultValue="" disabled={referenceStatus !== "ready"}>
                    <option value="">{referenceStatus === "ready" ? t.allCountries : referenceStatus === "error" ? t.countriesUnavailable : t.countriesLoading}</option>
                    {countries.map((country) => <option key={country.code} value={country.code}>{isArabic ? country.name_ar : country.name_en}</option>)}
                  </select>
                </div>
                <button type="submit" className="fursa-primary-button"><SearchIcon /><span>{t.search}</span></button>
              </div>
            </form>
            <div className="fursa-hero-note">
              <span><b className="fursa-check" aria-hidden="true">✓</b>{t.free}</span>
              <span><b className="fursa-check" aria-hidden="true">✓</b>{t.noAccount}</span>
              <span><b className="fursa-check" aria-hidden="true">✓</b>{t.sourceFirst}</span>
            </div>
          </div>
          <div className="fursa-hero-brand-stage" aria-label={isArabic ? "الهوية البصرية لفرصة" : "FURSA brand identity"}>
            <div className="fursa-hero-accent-orb fursa-hero-accent-orb-one" aria-hidden="true" />
            <div className="fursa-hero-accent-orb fursa-hero-accent-orb-two" aria-hidden="true" />
            <Image src="/brand/fursa-logo.png" width={1270} height={1300} priority alt={isArabic ? "شعار فرصة الرسمي" : "Official FURSA logo"} className="fursa-hero-logo" sizes="(max-width: 680px) 150px, (max-width: 900px) 32vw, 340px" />
            <span className="fursa-hero-tag"><span aria-hidden="true" />{isArabic ? "فرص عبر الخليج" : "Opportunities across the Gulf"}</span>
          </div>
        </div>
      </section>

      <section id="countries" className="fursa-section fursa-container" aria-labelledby="fursa-countries-title">
        <header className="fursa-section-heading">
          <div className="fursa-section-eyebrow">{t.countriesEyebrow}</div>
          <h2 id="fursa-countries-title">{t.countriesTitle}</h2>
          <p>{t.countriesIntro}</p>
        </header>
        {referenceStatus === "loading" ? <LoadingCards count={5} /> : referenceStatus === "error" ? referenceError : countries.length ? (
          <div className="fursa-country-grid">
            {countries.map((country) => (
              <Link className="fursa-country-card" key={country.code} href={`/${locale}/jobs?country=${encodeURIComponent(country.code)}`}>
                <div className="fursa-country-card-top">
                  {LOCAL_FLAG_CODES.has(country.code.toUpperCase()) ? (
                    <Image src={`/flags/${country.code.toLowerCase()}.svg`} width={40} height={26} alt="" aria-hidden="true" className="fursa-country-flag" unoptimized />
                  ) : (
                    <span className="fursa-country-flag-fallback" aria-hidden="true">{country.code.toUpperCase()}</span>
                  )}
                  <span className="fursa-country-code">{country.code}</span>
                </div>
                <span className="fursa-country-name">{isArabic ? country.name_ar : country.name_en}</span>
                <span className="fursa-country-arrow"><ArrowIcon /></span>
              </Link>
            ))}
          </div>
        ) : <p className="fursa-reference-empty" role="status">{t.countryEmpty}</p>}
      </section>

      <section className="fursa-section fursa-container fursa-category-section" aria-labelledby="fursa-categories-title">
        <header className="fursa-section-heading">
          <div className="fursa-section-eyebrow">{t.categoriesEyebrow}</div>
          <h2 id="fursa-categories-title">{t.categoriesTitle}</h2>
          <p>{t.categoriesIntro}</p>
        </header>
        {referenceStatus === "loading" ? <LoadingCards count={11} category /> : referenceStatus === "error" ? referenceError : categories.length ? (
          <div className="fursa-category-grid">
            {categories.map((category) => (
              <Link className="fursa-category-card" key={category.slug} href={`/${locale}/jobs?category=${encodeURIComponent(category.slug)}`}>
                <span className="fursa-category-symbol"><CategoryIcon slug={category.slug} /></span>
                <span className="fursa-category-name">{isArabic ? category.name_ar : category.name_en}</span>
                <span className="fursa-category-arrow"><ArrowIcon /></span>
              </Link>
            ))}
          </div>
        ) : <p className="fursa-reference-empty" role="status">{t.categoryEmpty}</p>}
      </section>

      <section id="about" className="fursa-section fursa-container fursa-trust-section" aria-labelledby="fursa-about-title">
        <div className="fursa-trust-copy">
          <div className="fursa-section-eyebrow">{t.aboutEyebrow}</div>
          <h2 id="fursa-about-title">{t.aboutTitle}</h2>
          <p>{t.aboutText}</p>
          <Link className="fursa-inline-link" href={`/${locale}/jobs`}>{t.browseJobs}<ArrowIcon /></Link>
        </div>
        <aside className="fursa-trust-card" aria-labelledby="fursa-trust-card-title">
          <h3 id="fursa-trust-card-title">{t.trustCardTitle}</h3>
          <ol className="fursa-trust-list">
            <li><span className="fursa-trust-number">01</span><div><strong>{t.trustOne}</strong><p>{t.trustOneText}</p></div></li>
            <li><span className="fursa-trust-number">02</span><div><strong>{t.trustTwo}</strong><p>{t.trustTwoText}</p></div></li>
            <li><span className="fursa-trust-number">03</span><div><strong>{t.trustThree}</strong><p>{t.trustThreeText}</p></div></li>
          </ol>
        </aside>
      </section>

      <section className="fursa-section fursa-container" aria-labelledby="fursa-catalogue-title">
        <div className="fursa-catalogue-note">
          <div className="fursa-empty-copy">
            <div className="fursa-section-eyebrow">{t.catalogueEyebrow}</div>
            <h2 id="fursa-catalogue-title">{t.catalogueTitle}</h2>
            <p>{t.catalogueText}</p>
          </div>
          <Link className="fursa-light-button" href={`/${locale}/jobs`}>{t.browseJobs}<ArrowIcon /></Link>
        </div>
      </section>

      <section id="safety" className="fursa-safety-band" aria-labelledby="fursa-safety-title">
        <div className="fursa-container fursa-safety-inner">
          <span className="fursa-safety-icon" aria-hidden="true">!</span>
          <p><strong id="fursa-safety-title">{t.safetyTitle}. </strong>{t.safetyText}</p>
        </div>
      </section>
    </main>
  );
}
