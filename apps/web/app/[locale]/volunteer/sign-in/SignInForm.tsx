"use client";

import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";
type GoogleCredentialResponse = { credential: string };
type VolunteerUser = { name: string; email: string; role: string; status: string };
declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void } } };
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const text = {
  en: {
    eyebrow: "FURSA VOLUNTEER WORKSPACE", title: "Welcome back.", intro: "Sign in to continue supporting trusted job discovery across the Gulf.", google: "Continue with Google", googleUnavailable: "Google sign-in will be available after setup", divider: "or sign in with email", email: "Email address", password: "Password", remember: "Keep me signed in on this device", forgotLink: "Forgot password?", show: "Show", hide: "Hide", submit: "Sign in", loading: "Signing you in…", invited: "Have an invitation?", invitationTitle: "Activate your volunteer access", invitationIntro: "Use the email address that received your FURSA invitation.", firstName: "First name", lastName: "Last name", confirm: "Create account", creating: "Creating your account…", error: "We couldn’t sign you in. Please try again.", noInvite: "Volunteer access is invitation-only. Public job browsing does not require an account.", back: "Back to FURSA", language: "العربية", passwordHint: "Use the password you created when accepting your invitation.", forgot: "If you need help recovering access, contact a FURSA administrator.", missingToken: "This invitation link is missing its token. Ask the FURSA administrator who invited you for a new link.", inviteSuccess: "Your volunteer account is ready. Opening your dashboard…", loginSuccess: "Signed in. Opening your dashboard…"
  },
  ar: {
    eyebrow: "مساحة عمل متطوعي فرصة", title: "مرحباً بعودتك.", intro: "سجّل الدخول لمواصلة دعم اكتشاف فرص العمل الموثوقة في الخليج.", google: "المتابعة باستخدام Google", googleUnavailable: "سيتاح تسجيل الدخول عبر Google بعد الإعداد", divider: "أو سجّل الدخول بالبريد الإلكتروني", email: "البريد الإلكتروني", password: "كلمة المرور", remember: "إبقائي مسجلاً على هذا الجهاز", forgotLink: "هل نسيت كلمة المرور؟", show: "إظهار", hide: "إخفاء", submit: "تسجيل الدخول", loading: "جارٍ تسجيل الدخول…", invited: "لديك دعوة؟", invitationTitle: "تفعيل صلاحية التطوع", invitationIntro: "استخدم عنوان البريد الإلكتروني الذي تلقّى دعوة فرصة.", firstName: "الاسم الأول", lastName: "اسم العائلة", confirm: "إنشاء الحساب", creating: "جارٍ إنشاء الحساب…", error: "تعذّر تسجيل الدخول. حاول مرة أخرى.", noInvite: "الوصول إلى فريق التطوع بالدعوة فقط. لا يلزم حساب لتصفح الوظائف العامة.", back: "العودة إلى فرصة", language: "English", passwordHint: "استخدم كلمة المرور التي أنشأتها عند قبول الدعوة.", forgot: "إذا احتجت إلى استعادة الوصول، فتواصل مع مسؤول فرصة.", missingToken: "رابط الدعوة لا يحتوي على الرمز المطلوب. اطلب رابطاً جديداً من مسؤول فرصة.", inviteSuccess: "تم إعداد حساب التطوع. جارٍ فتح لوحة التحكم…", loginSuccess: "تم تسجيل الدخول. جارٍ فتح لوحة التحكم…"
  }
} satisfies Record<Locale, Record<string, string>>;

export default function SignInForm({ locale }: { locale: Locale }) {
  const t = text[locale];
  const search = useSearchParams();
  const invitationToken = search.get("invitation") || "";
  const isInvitation = Boolean(invitationToken);
  const googleButton = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const post = useCallback(async (path: string, body: Record<string, string>) => {
    const csrfResponse = await fetch(`${API_BASE}/api/v1/volunteer/csrf/`, { credentials: "include", cache: "no-store" });
    if (!csrfResponse.ok) throw new Error(t.error);
    const csrf = await csrfResponse.json() as { csrfToken?: string };
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken || "" }, body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({})) as { detail?: string; password?: string[]; user?: VolunteerUser };
    if (!response.ok) throw new Error(data.detail || data.password?.join(" ") || t.error);
    return data;
  }, [t.error]);

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await post("/api/v1/volunteer/auth/google/", { credential: response.credential });
      setNotice(t.loginSuccess);
      window.location.assign(`/${locale}/volunteer/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setBusy(false);
    }
  }, [locale, post, t.error, t.loginSuccess]);

  const setupGoogle = useCallback(() => {
    const target = googleButton.current;
    const googleIdentity = window.google;
    if (!GOOGLE_CLIENT_ID || !googleIdentity || !target) return;
    target.replaceChildren();
    googleIdentity.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
    googleIdentity.accounts.id.renderButton(target, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: Math.min(360, target.clientWidth || 320), locale });
  }, [handleGoogleCredential, locale]);

  useEffect(() => { setupGoogle(); }, [setupGoogle]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (isInvitation) {
        if (!invitationToken) throw new Error(t.missingToken);
        await post("/api/v1/volunteer/auth/accept-invitation/", { token: invitationToken, email, password, first_name: firstName, last_name: lastName });
        setNotice(t.inviteSuccess);
      } else {
        await post("/api/v1/volunteer/auth/login/", { email, password, remember_me: rememberMe ? "true" : "false" });
        setNotice(t.loginSuccess);
      }
      window.location.assign(`/${locale}/volunteer/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error); setBusy(false);
    }
  }

  return (
    <section className={styles.authWrap}>
      {GOOGLE_CLIENT_ID && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={setupGoogle} />}
      <div className={styles.card}>
        <div className={styles.cardTop}><span className={styles.eyebrow}>{t.eyebrow}</span><div className={styles.statusMark} aria-hidden="true">✓</div></div>
        <h1>{isInvitation ? t.invitationTitle : t.title}</h1>
        <p className={styles.intro}>{isInvitation ? t.invitationIntro : t.intro}</p>
        <>
          {GOOGLE_CLIENT_ID ? <div ref={googleButton} className={styles.googleButton} aria-label={t.google} /> : <button type="button" className={styles.googleDisabled} disabled title={t.googleUnavailable}><span className={styles.googleG} aria-hidden="true">G</span>{t.google}</button>}
          {!GOOGLE_CLIENT_ID && <p className={styles.smallNote}>{t.googleUnavailable}</p>}
          <div className={styles.divider}><span>{t.divider}</span></div>
        </>
        <form onSubmit={submit} className={styles.form}>
          {isInvitation && <>
            <div className={styles.nameGrid}>
              <label>{t.firstName}<input autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={150} required /></label>
              <label>{t.lastName}<input autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={150} /></label>
            </div>
          </>}
          <label>{t.email}<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required dir="ltr" /></label>
          <label>{t.password}<span className={styles.passwordWrap}><input type={showPassword ? "text" : "password"} autoComplete={isInvitation ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} dir="ltr" /><button type="button" className={styles.showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? t.hide : t.show}</button></span></label>
          {!isInvitation && <div className={styles.loginOptions}><label className={styles.rememberLabel}><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />{t.remember}</label><Link href={`/${locale}/volunteer/reset-password`} className={styles.forgotLink}>{t.forgotLink}</Link></div>}
          {isInvitation && <p className={styles.smallNote}>{t.passwordHint}</p>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {notice && <p role="status" className={styles.notice}>{notice}</p>}
          <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? (isInvitation ? t.creating : t.loading) : (isInvitation ? t.confirm : t.submit)}</button>
        </form>
        <p className={styles.inviteNote}>{isInvitation ? t.noInvite : t.noInvite}</p>
      </div>
    </section>
  );
}
