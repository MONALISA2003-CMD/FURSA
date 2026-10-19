import { notFound } from "next/navigation";
import SubmissionsClient from "./SubmissionsClient";

type Locale = "en" | "ar";
export default async function SubmissionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  return <main style={{ maxWidth: 1050, margin: "0 auto", padding: "28px 18px" }}><SubmissionsClient locale={locale as Locale} /></main>;
}
