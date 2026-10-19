import { notFound } from "next/navigation";
import DashboardHome from "./DashboardHome";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";
export default async function VolunteerDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  const locale = rawLocale as Locale;
  return <main className={styles.page}><DashboardHome locale={locale} /></main>;
}
