"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const copy = {
  en: { title: "Recover your access", intro: "Enter the email address associated with your volunteer account.", email: "Email address", password: "New password", confirm: "Confirm new password", request: "Request reset link", save: "Update password", loading: "Please wait…", error: "We couldn’t complete this request.", note: "For security, the API does not confirm whether an email belongs to an account. Production reset emails are not enabled yet.", link: "Development reset link", success: "Password updated. You can now sign in.", mismatch: "The passwords do not match.", back: "Back to sign in", requestSuccess: "If an active volunteer account matches that email, a development reset link is available." },
  ar: { title: "استعادة الوصول", intro: "أدخل البريد الإلكتروني المرتبط بحساب التطوع.", email: "البريد الإلكتروني", password: "كلمة المرور الجديدة", confirm: "تأكيد كلمة المرور الجديدة", request: "طلب رابط الاستعادة", save: "تحديث كلمة المرور", loading: "يرجى الانتظار…", error: "تعذّر إكمال الطلب.", note: "لأسباب أمنية، لا تؤكد الواجهة ما إذا كان البريد مرتبطاً بحساب. لم يتم تفعيل رسائل الاستعادة للإنتاج بعد.", link: "رابط استعادة للتطوير", success: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.", mismatch: "كلمتا المرور غير متطابقتين.", back: "العودة إلى تسجيل الدخول", requestSuccess: "إذا كان البريد مرتبطاً بحساب تطوع نشط، فسيظهر رابط استعادة للتطوير." }
} satisfies Record<Locale, Record<string, string>>;

export default function ResetPasswordClient({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const search = useSearchParams();
  const uid = search.get("uid") || "";
  const token = search.get("token") || "";
  const confirming = Boolean(uid && token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setResetUrl("");
    if (confirming && password !== confirmation) { setError(t.mismatch); setBusy(false); return; }
    try {
      const csrfResponse = await fetch(`${API_BASE}/api/v1/volunteer/csrf/`, { credentials: "include", cache: "no-store" });
      if (!csrfResponse.ok) throw new Error(t.error);
      const csrf = await csrfResponse.json() as { csrfToken: string };
      const path = confirming ? "/api/v1/volunteer/auth/password-reset/confirm/" : "/api/v1/volunteer/auth/password-reset/request/";
      const body = confirming ? { uid, token, password } : { email, locale };
      const response = await fetch(`${API_BASE}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { detail?: string; password?: string[]; reset_url?: string };
      if (!response.ok) throw new Error(result.detail || result.password?.join(" ") || t.error);
      setMessage(confirming ? t.success : result.detail || t.requestSuccess);
      if (result.reset_url) setResetUrl(`${window.location.origin}${result.reset_url}`);
    } catch (err) { setError(err instanceof Error ? err.message : t.error); }
    finally { setBusy(false); }
  }

  return <section className={styles.authWrap}>
    <div className={styles.card}><span className={styles.eyebrow}>FURSA VOLUNTEERS</span><h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p>
      <form className={styles.form} onSubmit={submit}>
        {!confirming ? <label>{t.email}<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required dir="ltr" /></label> : <><label>{t.password}<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required dir="ltr" /></label><label>{t.confirm}<input type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} minLength={8} required dir="ltr" /></label></>}
        {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.notice} role="status">{message}</p>}
        {resetUrl && <p className={styles.notice}>{t.link}: <a href={resetUrl}>{resetUrl}</a></p>}
        <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? t.loading : confirming ? t.save : t.request}</button>
      </form><p className={styles.inviteNote}>{t.note}</p><div className={styles.authFooter}><Link href={`/${locale}/volunteer/sign-in`}>{t.back}</Link></div>
    </div>
  </section>;
}
