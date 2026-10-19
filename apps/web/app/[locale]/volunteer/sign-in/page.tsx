import { notFound } from "next/navigation";
import { Suspense } from "react";
import SignInForm from "./SignInForm";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";

export default async function VolunteerSignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  const locale = rawLocale as Locale;
  return (
    <main className={styles.page}>
      <Suspense fallback={<div className={styles.card} aria-busy="true">{locale === "ar" ? "جارٍ تحميل تسجيل الدخول…" : "Loading sign-in…"}</div>}>
        <SignInForm locale={locale} />
      </Suspense>
    </main>
  );
}
