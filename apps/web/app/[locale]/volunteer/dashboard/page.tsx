import { notFound } from "next/navigation";
import DashboardClient from "./DashboardClient";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";

export default async function VolunteerDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  return <main className={styles.page}><DashboardClient locale={rawLocale as Locale} /></main>;
}
