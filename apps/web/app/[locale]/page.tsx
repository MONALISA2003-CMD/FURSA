import Link from "next/link";
import { notFound } from "next/navigation";

type Locale = "en" | "ar";

const copy = {
  en: {
    tagline: "Your Next Opportunity Starts Here.",
    subhead: "Fresh jobs. Clear facts. Smarter discovery.",
    description:
      "Discover job opportunities across the Gulf in one clear place. Check the source, understand the details, and apply directly through the original route.",
    searchLabel: "What kind of role are you looking for?",
    searchPlaceholder: "Job title, skill, or employer",
    searchButton: "Find jobs",
    countriesTitle: "Explore opportunities across the Gulf",
    countries: ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain"],
    trustTitle: "Clear information. Your choice.",
    trustText:
      "Browse without creating a candidate account. Every published listing will show its source and last-checked date. Applications happen on the employer's or authorised source's website, email, or WhatsApp—not on FURSA.",
    latestTitle: "A clearer way to discover work",
    latestText:
      "The catalogue is being prepared. Job search and volunteer review workflows are built in upcoming phases.",
    viewJobs: "Browse jobs",
    language: "العربية",
    languageHref: "/ar",
    about: "About FURSA",
    safety: "Safety basics",
    badge: "Arabic + English",
  },
  ar: {
    tagline: "فرصتك القادمة تبدأ هنا.",
    subhead: "وظائف جديدة. معلومات واضحة. بحث أذكى.",
    description:
      "اكتشف فرص العمل في الخليج من مكان واحد. راجع المصدر وتفاصيل الوظيفة، ثم قدّم مباشرة عبر القناة الأصلية.",
    searchLabel: "ما نوع الوظيفة التي تبحث عنها؟",
    searchPlaceholder: "المسمى الوظيفي أو المهارة أو جهة العمل",
    searchButton: "ابحث عن وظائف",
    countriesTitle: "اكتشف الفرص في دول الخليج",
    countries: ["الإمارات العربية المتحدة", "المملكة العربية السعودية", "قطر", "الكويت", "البحرين"],
    trustTitle: "معلومات واضحة. والقرار لك.",
    trustText:
      "تصفّح دون إنشاء حساب للباحثين عن عمل. ستعرض كل وظيفة منشورة مصدرها وتاريخ آخر مراجعة. يتم التقديم عبر موقع جهة العمل أو المصدر المعتمد أو البريد الإلكتروني أو واتساب، وليس عبر فرصة.",
    latestTitle: "طريقة أوضح لاكتشاف فرص العمل",
    latestText:
      "يجري تجهيز فهرس الوظائف. سيُضاف البحث ومراجعة المتطوعين في المراحل القادمة.",
    viewJobs: "تصفّح الوظائف",
    language: "English",
    languageHref: "/en",
    about: "عن فرصة",
    safety: "نصائح السلامة",
    badge: "العربية + English",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

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
    <div className={`site-shell ${isArabic ? "rtl" : "ltr"}`} lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <header className="site-header">
        <Link href={`/${locale}`} className="brand" aria-label="FURSA home">
          <span className="brand-mark" aria-hidden="true">ف</span>
          <span className="brand-word">FURSA <span>فرصة</span></span>
        </Link>
        <nav className="header-nav" aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}>
          <a href="#about">{t.about}</a>
          <a href="#safety">{t.safety}</a>
          <Link href={t.languageHref as string} className="language-switch">{t.language}</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow"><span className="status-dot" /> {t.badge}</span>
            <h1>{t.tagline}</h1>
            <p className="hero-subhead">{t.subhead}</p>
            <p className="hero-description">{t.description}</p>
            <form className="search-panel" action={`/${locale}/jobs`} method="get">
              <label htmlFor="job-query">{t.searchLabel}</label>
              <div className="search-row">
                <input id="job-query" type="search" name="q" placeholder={t.searchPlaceholder as string} />
                <button type="submit">{t.searchButton}</button>
              </div>
            </form>
            <div className="hero-footnote">{isArabic ? "تصفح مجاني دون تسجيل" : "Free to browse · No candidate account required"}</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="visual-card card-main">
              <span className="visual-label">{isArabic ? "فرصتك" : "YOUR NEXT STEP"}</span>
              <span className="visual-glyph">✦</span>
              <strong>{isArabic ? "فرصة جديدة" : "New possibilities"}</strong>
              <span className="visual-line" />
              <span className="visual-line short" />
            </div>
            <div className="floating-chip chip-top">✓ {isArabic ? "معلومات واضحة" : "Clear job details"}</div>
            <div className="floating-chip chip-bottom">↗ {isArabic ? "مصدر الوظيفة" : "Original source"}</div>
          </div>
        </section>

        <section className="country-section" aria-labelledby="country-title">
          <div className="section-heading">
            <span className="eyebrow muted-eyebrow">{isArabic ? "منطقة واحدة، فرص كثيرة" : "ONE REGION, MANY POSSIBILITIES"}</span>
            <h2 id="country-title">{t.countriesTitle}</h2>
          </div>
          <div className="country-grid">
            {(t.countries as string[]).map((country, index) => (
              <div className="country-card" key={country}>
                <span className="country-number">0{index + 1}</span>
                <span>{country}</span>
                <span className="country-arrow" aria-hidden="true">↗</span>
              </div>
            ))}
          </div>
        </section>

        <section className="clarity-section" id="about">
          <div className="clarity-copy">
            <span className="eyebrow muted-eyebrow">{isArabic ? "مصدر واضح" : "BUILT AROUND CLARITY"}</span>
            <h2>{t.trustTitle}</h2>
            <p>{t.trustText}</p>
            <Link href={`/${locale}/jobs`} className="text-link">{t.viewJobs} <span aria-hidden="true">→</span></Link>
          </div>
          <div className="clarity-note" id="safety">
            <div className="note-icon" aria-hidden="true">✓</div>
            <strong>{isArabic ? "المصدر أولاً" : "Source first"}</strong>
            <p>{isArabic ? "راجع مصدر الإعلان وتاريخ آخر فحص قبل التقديم." : "Review the source and last-checked date before applying."}</p>
            <div className="note-divider" />
            <span>{isArabic ? "لن نخترع معلومات غير موجودة في المصدر." : "We won't invent details that the source doesn't provide."}</span>
          </div>
        </section>

        <section className="catalogue-preview">
          <div>
            <span className="eyebrow muted-eyebrow">{isArabic ? "قريباً" : "COMING IN THE NEXT PHASES"}</span>
            <h2>{t.latestTitle}</h2>
            <p>{t.latestText}</p>
          </div>
          <Link href={`/${locale}/jobs`} className="secondary-button">{t.viewJobs} <span aria-hidden="true">↗</span></Link>
        </section>
      </main>

      <footer className="site-footer">
        <Link href={`/${locale}`} className="footer-brand">FURSA <span>فرصة</span></Link>
        <p>{isArabic ? "منصة لاكتشاف الوظائف. التقديم لدى الجهة الأصلية." : "A job-discovery platform. Applications go to the original source."}</p>
        <span>© FURSA</span>
      </footer>
    </div>
  );
}
