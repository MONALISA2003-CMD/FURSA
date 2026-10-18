"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

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
    mainNavigation: "Main navigation",
    footerLine: "A clearer way to discover work across the Gulf.",
    footerNote: "FURSA helps people discover opportunities. Applications are completed through the original source.",
    browse: "Browse jobs",
    safetyGuidance: "Safety guidance",
    home: "FURSA home",
  },
  ar: {
    jobs: "ابحث عن وظائف",
    countries: "الدول",
    about: "عن فرصة",
    safety: "السلامة",
    language: "English",
    menu: "فتح قائمة التنقل",
    close: "إغلاق قائمة التنقل",
    mainNavigation: "التنقل الرئيسي",
    footerLine: "طريقة أوضح لاكتشاف فرص العمل في الخليج.",
    footerNote: "تساعد فرصة على اكتشاف الوظائف، ويتم التقديم عبر المصدر الأصلي.",
    browse: "تصفّح الوظائف",
    safetyGuidance: "إرشادات السلامة",
    home: "الصفحة الرئيسية لفرصة",
  },
} satisfies Record<Locale, Record<string, string>>;

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const isArabic = locale === "ar";
  const otherLocale = isArabic ? "en" : "ar";
  const pathname = usePathname() || `/${locale}`;
  const languagePath = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${otherLocale}`) || `/${otherLocale}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [locale, isArabic]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  // Preserve the current search filters, job return path, and in-page anchor
  // when switching language. A normal navigation is intentional so the locale
  // is rendered from a clean document request; modifier-clicks retain Link's
  // standard new-tab behaviour.
  function switchLanguage(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeMenu();
    if (typeof window === "undefined") return;
    const translatedPath = window.location.pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${otherLocale}`) || `/${otherLocale}`;
    window.location.assign(`${translatedPath}${window.location.search}${window.location.hash}`);
  }

  return (
    <header className="fursa-header">
      <div className="fursa-header-inner">
        <Link href={`/${locale}`} className="fursa-brand" aria-label={t.home} onClick={closeMenu}>
          <Image src="/brand/fursa-mark.png" width={48} height={48} alt="" aria-hidden="true" priority className="fursa-brand-mark" />
          <span className="fursa-brand-name"><strong>FURSA</strong><span lang="ar" dir="rtl">فرصة</span></span>
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="fursa-menu-toggle"
          aria-label={menuOpen ? t.close : t.menu}
          aria-expanded={menuOpen}
          aria-controls="fursa-main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>

        <nav ref={navRef} id="fursa-main-navigation" className={`fursa-nav ${menuOpen ? "is-open" : ""}`} aria-label={t.mainNavigation}>
          <Link href={`/${locale}/jobs`} onClick={closeMenu}>{t.jobs}</Link>
          <Link href={`/${locale}#countries`} onClick={closeMenu}>{t.countries}</Link>
          <Link href={`/${locale}#about`} onClick={closeMenu}>{t.about}</Link>
          <Link href={`/${locale}#safety`} onClick={closeMenu}>{t.safety}</Link>
          <Link href={languagePath} className="fursa-language-switch" lang={otherLocale} onClick={switchLanguage}>{t.language}</Link>
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
          <Link href={`/${locale}`} className="fursa-footer-brand" aria-label={t.home}>
            <Image src="/brand/fursa-mark.png" width={38} height={38} alt="" aria-hidden="true" />
            <span><strong>FURSA</strong><span lang="ar" dir="rtl">فرصة</span></span>
          </Link>
          <p>{t.footerLine}</p>
        </div>
        <nav className="fursa-footer-links" aria-label={isArabic ? "روابط التذييل" : "Footer links"}>
          <Link href={`/${locale}/jobs`}>{t.browse}</Link>
          <Link href={`/${locale}#about`}>{t.about}</Link>
          <Link href={`/${locale}#safety`}>{t.safetyGuidance}</Link>
        </nav>
      </div>
      <div className="fursa-footer-bottom">
        <span>© {new Date().getFullYear()} FURSA · فرصة</span>
        <p>{t.footerNote}</p>
      </div>
    </footer>
  );
}
