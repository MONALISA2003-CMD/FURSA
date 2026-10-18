import { notFound } from "next/navigation";
import HomeContent from "./HomeContent";

type Locale = "en" | "ar";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== "en" && rawLocale !== "ar") notFound();
  return <HomeContent locale={rawLocale as Locale} />;
}
