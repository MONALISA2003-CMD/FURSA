import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Locale = "en" | "ar";

const countries = [
  { code: "AE", en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
  { code: "SA", en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
  { code: "QA", en: "Qatar", ar: "قطر" },
  { code: "KW", en: "Kuwait", ar: "الكويت" },
  { code: "BH", en: "Bahrain", ar: "البحرين" },
];

const categories = [
  { slug: "administration", en: "Administration", ar: "الإدارة", symbol: "▤" },
  { slug: "construction", en: "Construction", ar: "الإنشاءات", symbol: "⌂" },
  { slug: "customer-service", en: "Customer Service", ar: "خدمة العملاء", symbol: "◌" },
  { slug: "engineering", en: "Engineering", ar: "الهندسة", symbol: "⌘" },
  { slug: "finance-accounting", en: "Finance & Accounting", ar: "المالية والمحاسبة", symbol: "＋" },
  { slug: "healthcare", en: "Healthcare", ar: "الرعاية الصحية", symbol: "＋" },
  { slug: "hospitality", en: "Hospitality", ar: "الضيافة", symbol: "✦" },
  { slug: "it-software", en: "IT & Software", ar: "تقنية المعلومات والبرمجيات", symbol: "⌘" },
  { slug: "logistics-warehouse", en: "Logistics & Warehousing", ar: "الخدمات اللوجستية والمستودعات", symbol: "⇄" },
  { slug: "sales-marketing", en: "Sales & Marketing", ar: "المبيعات والتسويق", symbol: "↗" },
  { slug: "skilled-trades", en: "Skilled Trades", ar: "المهن الحرفية", symbol: "⚒" },
];

const copy = {
  en: {
    kicker: "FURSA · فرصة · JOB DISCOVERY ACROSS THE GULF",
    headline: "Find your next opportunity across the Gulf.",
    intro: "Explore job opportunities in one clear place. Understand the source, check the details, and continue to the original application route.",
    queryLabel: "What role are you looking for?",
    queryPlaceholder: "Job title, skill, or employer",
    countryLabel: "Choose a country",
    allCountries: "All five countries",
    search: "Search jobs",
    free: "Free to browse",
    noAccount: "No job-seeker account required",
    sourceFirst: "Source-led information",
    countriesEyebrow: "START WITH A PLACE",
    countriesTitle: "Explore jobs by country",
    countriesIntro: "Start with the Gulf country that interests you. You can refine your search by region and job category next.",
    categoriesEyebrow: "EXPLORE YOUR FIELD",
    categoriesTitle: "Browse by job category",
    categoriesIntro: "Explore a broad set of job fields. Available vacancies will appear only when they have been added and reviewed.",
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
    catalogueText: "We are preparing the catalogue and its review process. Vacancies should appear only when the source and application route have been checked. We will not fill the page with made-up listings.",
    browseJobs: "Browse the job catalogue",
    safetyTitle: "Stay thoughtful when applying",
    safetyText: "Never pay to secure a job or interview. Check the employer and application destination, be cautious with personal documents, and report a listing that appears suspicious or out of date.",
    arrow: "Explore",
  },
  ar: {
    kicker: "فرصة · FURSA · اكتشاف الوظائف في الخليج",
    headline: "اكتشف فرصتك القادمة في الخليج.",
    intro: "اكتشف فرص العمل من مكان واحد وبطريقة واضحة. راجع المصدر والتفاصيل، ثم انتقل إلى قناة التقديم الأصلية.",
    queryLabel: "ما الوظيفة التي تبحث عنها؟",
    queryPlaceholder: "المسمى الوظيفي أو المهارة أو جهة العمل",
    countryLabel: "اختر الدولة",
    allCountries: "جميع الدول الخمس",
    search: "ابحث عن وظائف",
    free: "التصفح مجاني",
    noAccount: "لا حاجة إلى حساب للباحثين عن عمل",
    sourceFirst: "المصدر أساس المعلومات",
    countriesEyebrow: "ابدأ باختيار المكان",
    countriesTitle: "اكتشف الوظائف حسب الدولة",
    countriesIntro: "ابدأ بالدولة الخليجية التي تهمك، ثم حدّد المنطقة وفئة الوظيفة لتضييق نطاق البحث.",
    categoriesEyebrow: "اكتشف مجال عملك",
    categoriesTitle: "تصفّح حسب فئة الوظيفة",
    categoriesIntro: "استكشف مجموعة من المجالات المهنية. لن تظهر الوظائف إلا بعد إضافتها ومراجعتها.",
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
    catalogueText: "نعمل على تجهيز فهرس الوظائف وآلية مراجعتها. ينبغي ألا تُعرض الوظائف إلا بعد التحقق من مصدرها وقناة التقديم. لن نملأ الصفحة بإعلانات غير حقيقية.",
    browseJobs: "تصفّح فهرس الوظائف",
    safetyTitle: "تحقّق قبل التقديم",
    safetyText: "لا تدفع المال للحصول على وظيفة أو مقابلة. تحقق من جهة العمل ورابط التقديم، وتعامل بحذر مع مستنداتك الشخصية، وأبلغ عن أي إعلان يبدو مشبوهاً أو قديماً.",
    arrow: "استكشف",
  },
} satisfies Record<Locale, Record<string, string>>;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  const locale = rawLocale as Locale;
  const t = copy[locale];
  const isArabic = locale === "ar";

  return (
    <main className="fursa-home" lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <section className="fursa-hero">
        <div className="fursa-hero-inner">
          <div className="fursa-hero-copy">
            <div className="fursa-kicker"><span className="fursa-kicker-dot" aria-hidden="true" />{t.kicker}</div>
            <h1>{t.headline}</h1>
            <p className="fursa-hero-lead">{t.intro}</p>
            <form action={`/${locale}/jobs`} method="get" className="fursa-search-box" role="search">
              <div className="fursa-search-grid">
                <div className="fursa-search-field">
                  <label htmlFor="fursa-job-query">{t.queryLabel}</label>
                  <input id="fursa-job-query" type="search" name="q" maxLength={160} placeholder={t.queryPlaceholder} />
                </div>
                <div className="fursa-search-field">
                  <label htmlFor="fursa-job-country">{t.countryLabel}</label>
                  <select id="fursa-job-country" name="country" defaultValue="">
                    <option value="">{t.allCountries}</option>
                    {countries.map((country) => <option key={country.code} value={country.code}>{isArabic ? country.ar : country.en}</option>)}
                  </select>
                </div>
                <button type="submit" className="fursa-primary-button">{t.search}<span aria-hidden="true">{isArabic ? "←" : "→"}</span></button>
              </div>
            </form>
            <div className="fursa-hero-note">
              <span><b className="fursa-check" aria-hidden="true">✓</b>{t.free}</span>
              <span><b className="fursa-check" aria-hidden="true">✓</b>{t.noAccount}</span>
              <span><b className="fursa-check" aria-hidden="true">✓</b>{t.sourceFirst}</span>
            </div>
          </div>
          <div className="fursa-hero-brand-stage">
            <Image src="/brand/fursa-logo.png" width={1270} height={1300} priority alt={isArabic ? "شعار فرصة الرسمي" : "Official FURSA logo"} className="fursa-hero-logo" sizes="(max-width: 680px) 80vw, (max-width: 900px) 42vw, 430px" />
            <div className="fursa-brand-caption" aria-label={isArabic ? "لغتان وخمس دول" : "Two languages and five countries"}>
              <span>{isArabic ? "العربية والإنجليزية" : "Arabic + English"}</span>
              <span>{isArabic ? "خمس دول خليجية" : "Five Gulf countries"}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="countries" className="fursa-section fursa-container" aria-labelledby="fursa-countries-title">
        <header className="fursa-section-heading">
          <div className="fursa-section-eyebrow">{t.countriesEyebrow}</div>
          <h2 id="fursa-countries-title">{t.countriesTitle}</h2>
          <p>{t.countriesIntro}</p>
        </header>
        <div className="fursa-country-grid">
          {countries.map((country, index) => (
            <Link className="fursa-country-card" key={country.code} href={`/${locale}/jobs?country=${country.code}`}>
              <div className="fursa-country-topline"><span>0{index + 1}</span><span className="fursa-country-code">{country.code}</span></div>
              <span className="fursa-country-name">{isArabic ? country.ar : country.en}</span>
              <span className="fursa-country-arrow" aria-hidden="true">{isArabic ? "↙" : "↗"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="fursa-section fursa-container" aria-labelledby="fursa-categories-title">
        <header className="fursa-section-heading">
          <div className="fursa-section-eyebrow">{t.categoriesEyebrow}</div>
          <h2 id="fursa-categories-title">{t.categoriesTitle}</h2>
          <p>{t.categoriesIntro}</p>
        </header>
        <div className="fursa-category-grid">
          {categories.map((category) => (
            <Link className="fursa-category-card" key={category.slug} href={`/${locale}/jobs?category=${category.slug}`}>
              <span className="fursa-category-symbol" aria-hidden="true">{category.symbol}</span>
              <span>{isArabic ? category.ar : category.en}</span>
              <span className="fursa-category-arrow" aria-hidden="true">{isArabic ? "←" : "→"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="about" className="fursa-section fursa-container fursa-trust-section" aria-labelledby="fursa-about-title">
        <div className="fursa-trust-copy">
          <div className="fursa-section-eyebrow">{t.aboutEyebrow}</div>
          <h2 id="fursa-about-title">{t.aboutTitle}</h2>
          <p>{t.aboutText}</p>
          <Link className="fursa-inline-link" href={`/${locale}/jobs`}>{t.browseJobs}<span aria-hidden="true">{isArabic ? "←" : "→"}</span></Link>
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
          <Link className="fursa-light-button" href={`/${locale}/jobs`}>{t.browseJobs}<span aria-hidden="true">{isArabic ? "←" : "→"}</span></Link>
        </div>
      </section>

      <section id="safety" className="fursa-safety-band" aria-label={t.safetyTitle}>
        <div className="fursa-container fursa-safety-inner">
          <span className="fursa-safety-icon" aria-hidden="true">!</span>
          <p><strong>{t.safetyTitle}. </strong>{t.safetyText}</p>
        </div>
      </section>
    </main>
  );
}
