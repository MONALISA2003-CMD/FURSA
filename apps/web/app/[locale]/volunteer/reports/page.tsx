import { notFound } from "next/navigation";
import ReportsClient from "./ReportsClient";
type Locale = "en" | "ar";
export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "en" && locale !== "ar") notFound(); return <main style={{ maxWidth: 1050, margin: "0 auto", padding: "28px 18px" }}><ReportsClient locale={locale as Locale} /></main>; }
