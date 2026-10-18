import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import "./fursa-ui.css";

type Locale = "en" | "ar";

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  const locale = rawLocale as Locale;

  return (
    <div className={`fursa-locale ${locale === "ar" ? "rtl" : "ltr"}`} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <a className="fursa-skip-link" href="#main-content">{locale === "ar" ? "تجاوز إلى المحتوى" : "Skip to content"}</a>
      <SiteHeader locale={locale} />
      <div id="main-content" className="fursa-layout-content">{children}</div>
      <SiteFooter locale={locale} />
    </div>
  );
}
