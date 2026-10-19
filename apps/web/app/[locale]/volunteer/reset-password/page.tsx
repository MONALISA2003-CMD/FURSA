import { notFound } from "next/navigation";
import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  return <main className={styles.page}><Suspense fallback={<div className={styles.card} aria-busy="true">{rawLocale === "ar" ? "جارٍ التحميل…" : "Loading…"}</div>}><ResetPasswordClient locale={rawLocale as Locale} /></Suspense></main>;
}
