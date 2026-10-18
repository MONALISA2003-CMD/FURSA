"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Locale = "en" | "ar";

const copy = {
  en: {
    jobs: "Find jobs",
    countries: "Countries",
    about: "About FURSA",
    safety: "Safety",
    language: "العربية",
    menu: "Open navigation menu",
    close: "Close navigation menu",
    footerLine: "A clearer way to discover work across the Gulf.",
    footerNote: "FURSA helps people discover opportunities. Applications are completed through the original source.",
    browse: "Browse jobs",
    privacy: "Privacy & safety",
  },
  ar: {
    jobs: "ابحث عن وظائف",
    countries: "الدول",
    about: "عن فرصة",
    safety: "السلامة",
    language: "English",
    menu: "فتح قائمة التنقل",
    close: "إغلاق قائمة التنقل",
    footerLine: "طريقة أوضح لاكتشاف فرص العمل في الخليج.",
    footerNote: "تساعد فرصة على اكتشاف الوظائف، ويتم التقديم عبر المصدر الأصلي.",
    browse: "تصفّح الوظائف",
    privacy: "الخصوصية والسلامة",
  },
} satisfies Record<Locale, Record<string, string>>;

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const isArabic = locale === "ar";
  const otherLocale = isArabic ? "en" : "ar";
  const pathname = usePathname() || `/${locale}`;
  const languagePath = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${otherLocale}`);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [locale, isArabic]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fursa-header">
      <div className="fursa-header-inner">
        <Link href={`/${locale}`} className="fursa-brand" aria-label={isArabic ? "فرصة - الصفحة الرئيسية" : "FURSA home"} onClick={closeMenu}>
          <Image src="/brand/fursa-mark.png" width={48} height={48} alt="" aria-hidden="true" priority className="fursa-brand-mark" />
          <span className="fursa-brand-name"><strong>FURSA</strong><span lang="ar" dir="rtl">فرصة</span></span>
        </Link>

        <button
          type="button"
          className="fursa-menu-toggle"
          aria-label={menuOpen ? t.close : t.menu}
          aria-expanded={menuOpen}
          aria-controls="fursa-main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>

        <nav id="fursa-main-navigation" className={`fursa-nav ${menuOpen ? "is-open" : ""}`} aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}>
          <Link href={`/${locale}/jobs`} onClick={closeMenu}>{t.jobs}</Link>
          <Link href={`/${locale}#countries`} onClick={closeMenu}>{t.countries}</Link>
          <Link href={`/${locale}#about`} onClick={closeMenu}>{t.about}</Link>
          <Link href={`/${locale}#safety`} onClick={closeMenu}>{t.safety}</Link>
          <Link href={languagePath || `/${otherLocale}`} className="fursa-language-switch" lang={otherLocale} onClick={closeMenu}>{t.language}</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const isArabic = locale === "ar";

  return (
    <footer className="fursa-footer">
      <div className="fursa-footer-main">
        <div className="fursa-footer-brand-block">
          <Link href={`/${locale}`} className="fursa-footer-brand" aria-label={isArabic ? "العودة إلى فرصة" : "FURSA home"}>
            <Image src="/brand/fursa-mark.png" width={38} height={38} alt="" aria-hidden="true" />
            <span><strong>FURSA</strong><span lang="ar" dir="rtl">فرصة</span></span>
          </Link>
          <p>{t.footerLine}</p>
        </div>
        <div className="fursa-footer-links">
          <Link href={`/${locale}/jobs`}>{t.browse}</Link>
          <Link href={`/${locale}#about`}>{t.about}</Link>
          <Link href={`/${locale}#safety`}>{t.privacy}</Link>
        </div>
      </div>
      <div className="fursa-footer-bottom">
        <span>© {new Date().getFullYear()} FURSA · فرصة</span>
        <p>{t.footerNote}</p>
      </div>
    </footer>
  );
}
