"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Locale = "en" | "ar";
type Dashboard = { user: { name: string; email: string; role: string; status: string }; is_founder: boolean; capabilities: { can_manage_jobs: boolean; can_invite_admins: boolean; can_manage_team: boolean } };
type Invitation = { id: number; email: string; role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; status: string };
type Member = { id: number; name: string; email: string; role: string; status: string; is_founder: boolean };
type Stats = { published: number; drafts: number; closingSoon: number; openReports: number };
const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const words = {
  en: { title: "FURSA Admin Workspace", intro: "Manage trusted vacancies and keep job information accurate.", loading: "Loading workspace…", jobs: "Manage and post jobs", reports: "Public safety reports", email: "Volunteer admin email", invite: "Create invitation link", inviteHelp: "Copy this link and send it privately through WhatsApp or email. It expires in 24 hours and works once.", invitations: "Recent invitations", team: "Admin team", revoke: "Revoke", deactivate: "Deactivate access", reactivate: "Reactivate access", copy: "Copy link", logout: "Sign out", error: "Could not load the workspace.", signIn: "Please sign in with your approved FURSA admin account.", founder: "Founder controls", admin: "Admin", pending: "Pending", accepted: "Accepted", expired: "Expired", revoked: "Revoked", status: "Status", noInvites: "No invitations yet.", noMembers: "No admin accounts found.", copied: "Link copied.", resetLink: "Create password link", inviteOk: "Invitation created. Copy the link and send it privately.", confirmDeactivate: "Change this admin's access?", inviteError: "Could not create invitation.", accountError: "Could not update account access.", language: "العربية", activity: "Activity is recorded for key changes.", published: "Published jobs", drafts: "Drafts", closingSoon: "Closing / re-check soon", openReports: "Open reports" },
  ar: { title: "مساحة إدارة فرصة", intro: "أدر الوظائف الموثوقة وحافظ على دقة معلوماتها.", loading: "جارٍ تحميل مساحة العمل…", jobs: "إدارة الوظائف ونشرها", reports: "بلاغات السلامة العامة", email: "بريد مسؤول التطوع", invite: "إنشاء رابط دعوة", inviteHelp: "انسخ الرابط وأرسله بشكل خاص عبر واتساب أو البريد الإلكتروني. تنتهي صلاحيته خلال 24 ساعة ويستخدم مرة واحدة.", invitations: "أحدث الدعوات", team: "فريق المسؤولين", revoke: "إلغاء", deactivate: "تعطيل الوصول", reactivate: "إعادة تفعيل الوصول", copy: "نسخ الرابط", logout: "تسجيل الخروج", error: "تعذر تحميل مساحة العمل.", signIn: "سجّل الدخول بحساب مسؤول فرصة المعتمد.", founder: "صلاحيات المؤسس", admin: "مسؤول", pending: "قيد الانتظار", accepted: "مقبولة", expired: "منتهية", revoked: "ملغاة", status: "الحالة", noInvites: "لا توجد دعوات بعد.", noMembers: "لا توجد حسابات مسؤولين.", copied: "تم نسخ الرابط.", resetLink: "إنشاء رابط كلمة المرور", inviteOk: "تم إنشاء الدعوة. انسخ الرابط وأرسله بشكل خاص.", confirmDeactivate: "هل تريد تغيير صلاحية هذا المسؤول؟", inviteError: "تعذر إنشاء الدعوة.", accountError: "تعذر تحديث صلاحية الحساب.", language: "English", activity: "يتم تسجيل التغييرات المهمة.", published: "وظائف منشورة", drafts: "مسودات", closingSoon: "قريبة الإغلاق أو المراجعة", openReports: "بلاغات مفتوحة" }
} as const;
async function csrf() { const r = await fetch(`${API}/api/v1/volunteer/csrf/`, { credentials: "include", cache: "no-store" }); if (!r.ok) throw new Error("CSRF"); return (await r.json()).csrfToken as string; }
export default function DashboardHome({ locale }: { locale: Locale }) {
  const t = words[locale];
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({published:0,drafts:0,closingSoon:0,openReports:0});
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`${API}/api/v1/volunteer/dashboard/`, { credentials: "include", cache: "no-store" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 403 ? t.signIn : (body.detail || t.error));
      setDashboard(body as Dashboard);
      const [jobsResponse, reportsResponse] = await Promise.all([
        fetch(`${API}/api/v1/moderation/jobs/`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/api/v1/moderation/reports/`, { credentials: "include", cache: "no-store" })
      ]);
      const jobsBody = jobsResponse.ok ? await jobsResponse.json().catch(() => ({})) : {};
      const reportsBody = reportsResponse.ok ? await reportsResponse.json().catch(() => ({})) : {};
      const jobs = (jobsBody.results || []) as Array<{status:string;expires_at?:string;deadline_at?:string}>;
      const reports = (reportsBody.results || []) as Array<{status:string}>;
      const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
      setStats({published:jobs.filter(j=>j.status==="PUBLISHED").length, drafts:jobs.filter(j=>j.status==="DRAFT").length, closingSoon:jobs.filter(j=>j.status==="PUBLISHED" && [j.deadline_at,j.expires_at].some(d=>d && new Date(d).getTime()<=soon && new Date(d).getTime()>=Date.now())).length, openReports:reports.filter(r=>["OPEN","INVESTIGATING"].includes(r.status)).length});
      if (body.is_founder) {
        const [ir, tr] = await Promise.all([
          fetch(`${API}/api/v1/volunteer/invitations/`, { credentials: "include", cache: "no-store" }),
          fetch(`${API}/api/v1/volunteer/team/`, { credentials: "include", cache: "no-store" })
        ]);
        if (ir.ok) setInvitations(((await ir.json()).results || []) as Invitation[]);
        if (tr.ok) setMembers(((await tr.json()).results || []) as Member[]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : t.error); }
  }, [t.error, t.signIn]);
  useEffect(() => { void load(); }, [load]);
  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setInviteUrl("");
    try {
      const token = await csrf();
      const r = await fetch(`${API}/api/v1/volunteer/invitations/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": token }, body: JSON.stringify({ email, locale }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.detail || body.email || t.inviteError);
      const url = `${window.location.origin}${body.invitation_url}`;
      setInviteUrl(url); setEmail(""); setMessage(t.inviteOk); await load();
    } catch (e) { setError(e instanceof Error ? e.message : t.inviteError); }
    finally { setBusy(false); }
  }
  async function revoke(id: number) {
    try { const token = await csrf(); const r = await fetch(`${API}/api/v1/volunteer/invitations/${id}/revoke/`, { method: "POST", credentials: "include", headers: { "X-CSRFToken": token } }); if (!r.ok) throw new Error(t.error); setMessage(t.revoked); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : t.error); }
  }
  async function createPasswordLink(member: Member) {
    setError(""); setMessage(""); setResetUrl("");
    try { const token = await csrf(); const r = await fetch(`${API}/api/v1/volunteer/team/${member.id}/password-reset-link/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": token }, body: JSON.stringify({ locale }) }); const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.detail || t.error); setResetUrl(`${window.location.origin}${body.reset_url}`); }
    catch (e) { setError(e instanceof Error ? e.message : t.error); }
  }
  async function changeAccess(member: Member) {
    if (member.is_founder || !window.confirm(t.confirmDeactivate)) return;
    const status = member.status === "ACTIVE" ? "REVOKED" : "ACTIVE";
    try { const token = await csrf(); const r = await fetch(`${API}/api/v1/volunteer/team/${member.id}/update/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": token }, body: JSON.stringify({ status }) }); const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.detail || t.accountError); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : t.accountError); }
  }
  async function logout() { try { const token = await csrf(); await fetch(`${API}/api/v1/volunteer/auth/logout/`, { method: "POST", credentials: "include", headers: { "X-CSRFToken": token } }); } finally { window.location.assign(`/${locale}/volunteer/sign-in`); } }
  if (!dashboard && !error) return <div style={wrap} dir={locale === "ar" ? "rtl" : "ltr"}><p>{t.loading}</p></div>;
  return <div style={wrap} dir={locale === "ar" ? "rtl" : "ltr"}>
    <header style={header}><div><span style={eyebrow}>FURSA · ADMIN</span><h1 style={{ margin: "8px 0" }}>{t.title}</h1><p style={{ color: "#5a6c7d", margin: 0 }}>{t.intro}</p></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Link href={`/${locale === "en" ? "ar" : "en"}/volunteer/dashboard`}>{t.language}</Link><button onClick={() => void logout()} style={secondary}>{t.logout}</button></div></header>
    {dashboard && <p style={muted}>{dashboard.user.name} · {dashboard.user.email} · {t.admin}{dashboard.is_founder ? ` · ${t.founder}` : ""}</p>}
    {error && <p role="alert" style={alert}>{error}</p>}{message && <p role="status" style={success}>{message}</p>}
    <section style={statsGrid}><div style={statCard}><span>{t.published}</span><strong>{stats.published}</strong></div><div style={statCard}><span>{t.drafts}</span><strong>{stats.drafts}</strong></div><div style={statCard}><span>{t.closingSoon}</span><strong>{stats.closingSoon}</strong></div><div style={statCard}><span>{t.openReports}</span><strong>{stats.openReports}</strong></div></section>
    <section style={cards}><Link href={`/${locale}/volunteer/jobs`} style={card}><strong>{t.jobs}</strong><span>→</span></Link><Link href={`/${locale}/volunteer/reports`} style={card}><strong>{t.reports}</strong><span>→</span></Link></section>
    <p style={muted}>{t.activity}</p>
    {dashboard?.is_founder && <section style={panel}><h2>{t.founder}</h2><form onSubmit={createInvite} style={form}><label style={field}>{t.email}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="volunteer@example.com" style={input} /></label><button disabled={busy} style={primary}>{busy ? "…" : t.invite}</button></form><p style={muted}>{t.inviteHelp}</p>{inviteUrl && <div style={urlBox}><a href={inviteUrl} style={{ overflowWrap: "anywhere" }}>{inviteUrl}</a><button style={secondary} onClick={() => { void navigator.clipboard.writeText(inviteUrl).then(() => setMessage(t.copied)); }}>{t.copy}</button></div>}
      {resetUrl && <div style={urlBox}><a href={resetUrl} style={{ overflowWrap: "anywhere" }}>{resetUrl}</a><button style={secondary} onClick={() => { void navigator.clipboard.writeText(resetUrl).then(() => setMessage(t.copied)); }}>{t.copy}</button></div>}
      <h3>{t.invitations}</h3>{invitations.length === 0 ? <p>{t.noInvites}</p> : invitations.map(i => <div key={i.id} style={listRow}><div><strong>{i.email}</strong><p style={muted}>{i.status} · {new Date(i.expires_at).toLocaleString(locale)}</p></div>{i.status === "pending" && <button style={secondary} onClick={() => void revoke(i.id)}>{t.revoke}</button>}</div>)}
      <h3>{t.team}</h3>{members.length === 0 ? <p>{t.noMembers}</p> : members.map(m => <div key={m.id} style={listRow}><div><strong>{m.name || m.email}</strong><p style={muted}>{m.email} · {m.is_founder ? t.founder : t.admin} · {m.status}</p></div>{!m.is_founder && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={secondary} onClick={() => void createPasswordLink(m)}>{t.resetLink}</button><button style={secondary} onClick={() => void changeAccess(m)}>{m.status === "ACTIVE" ? t.deactivate : t.reactivate}</button></div>}</div>)}
    </section>}
  </div>;
}
const wrap = { maxWidth: 1080, margin: "0 auto", padding: "28px 18px 60px", color: "#12243a", fontFamily: "Arial, sans-serif" } as const;
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #dbe4ec", paddingBottom: 22 } as const;
const eyebrow = { fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#1268a5" } as const;
const muted = { color: "#637487", fontSize: 13 } as const;
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, margin: "22px 0 10px" } as const;
const statCard = { display: "grid", gap: 8, padding: 16, border: "1px solid #dbe4ec", borderRadius: 14, background: "#f8fbfd", color: "#526579", fontSize: 13 } as const;
const cards = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, margin: "22px 0" } as const;
const card = { display: "flex", justifyContent: "space-between", gap: 12, padding: 22, border: "1px solid #dbe4ec", borderRadius: 16, color: "#123a5b", textDecoration: "none", background: "white", boxShadow: "0 5px 18px #163b5510" } as const;
const panel = { marginTop: 26, padding: 22, border: "1px solid #dbe4ec", borderRadius: 16, background: "#fff" } as const;
const form = { display: "flex", alignItems: "end", gap: 12, flexWrap: "wrap" } as const;
const field = { display: "grid", gap: 6, flex: "1 1 280px", fontWeight: 700, fontSize: 14 } as const;
const input = { width: "100%", boxSizing: "border-box" as const, padding: "12px", border: "1px solid #bdcbd8", borderRadius: 9, font: "inherit" } as const;
const primary = { padding: "12px 16px", background: "#1268a5", color: "white", border: 0, borderRadius: 9, fontWeight: 700, cursor: "pointer" } as const;
const secondary = { padding: "10px 14px", background: "#f2f6fa", color: "#12243a", border: "1px solid #c9d5e0", borderRadius: 9, fontWeight: 700, cursor: "pointer" } as const;
const listRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #e8eef3" } as const;
const urlBox = { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: 12, background: "#f2f7fb", borderRadius: 10 } as const;
const alert = { padding: 12, borderRadius: 10, background: "#fff0f0", color: "#9c2020" } as const;
const success = { padding: 12, borderRadius: 10, background: "#eef9f0", color: "#1f6631" } as const;
