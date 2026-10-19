"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import styles from "../volunteer.module.css";

type Locale = "en" | "ar";
type VolunteerUser = { name: string; email: string; role: "CONTRIBUTOR" | "REVIEWER" | "ADMIN"; status: string };
type DashboardData = { user: VolunteerUser; capabilities: { can_submit_vacancies: boolean; can_review_vacancies: boolean; can_manage_team: boolean } };
type Invitation = { id: number; email: string; role: string; status: string; expires_at: string };
type TeamMember = { id: number; name: string; email: string; role: string; status: string };
type TeamEdit = { role: string; status: string };
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const t = {
  en: { loading: "Loading your workspace…", title: "Your FURSA workspace", intro: "A clear, secure place to support trustworthy job discovery.", overview: "Overview", submissions: "Vacancy submissions", submissionsText: "Draft and submission tools will be introduced in the next implementation stage.", review: "Review queue", reviewText: "Review tools become available as the vacancy workflow is implemented.", reports: "Safety reports", reportsText: "Report investigation tools are planned for Phase 4B.", team: "Volunteer team", teamText: "Invite approved volunteers and review invitation status.", email: "Volunteer email", role: "Role", inviteCreated: "Development invitation created.", invite: "Create invitation", sending: "Creating…", contributor: "Contributor", reviewer: "Reviewer", admin: "Admin", signout: "Sign out", back: "Public FURSA site", error: "We couldn’t load the workspace.", signedOut: "You have been signed out.", invitations: "Recent invitations", noInvites: "No invitations yet.", pending: "Pending", accepted: "Accepted", expired: "Expired", revoked: "Revoked", status: "Status", expires: "Expires", revoke: "Revoke", teamMembers: "Current volunteers", active: "Active", suspended: "Suspended", revokedStatus: "Revoked", save: "Save changes", saved: "Volunteer access updated.", language: "العربية", login: "Volunteer sign in", permissionNote: "Your role controls which tools are available. The server enforces permissions on every protected request." },
  ar: { loading: "جارٍ تحميل مساحة العمل…", title: "مساحة عمل فرصة", intro: "مساحة واضحة وآمنة لدعم اكتشاف الوظائف الموثوقة.", overview: "نظرة عامة", submissions: "طلبات الوظائف", submissionsText: "ستتم إضافة أدوات المسودات والإرسال في المرحلة التالية.", review: "قائمة المراجعة", reviewText: "ستتوفر أدوات المراجعة عند تنفيذ سير عمل الوظائف.", reports: "بلاغات السلامة", reportsText: "أدوات التحقيق في البلاغات ضمن المرحلة 4B.", team: "فريق المتطوعين", teamText: "أرسل دعوات للمتطوعين المعتمدين وراجع حالتها.", email: "بريد المتطوع", role: "الدور", inviteCreated: "تم إنشاء دعوة للتطوير.", invite: "إنشاء دعوة", sending: "جارٍ الإنشاء…", contributor: "مساهم", reviewer: "مراجع", admin: "مسؤول", signout: "تسجيل الخروج", back: "موقع فرصة العام", error: "تعذّر تحميل مساحة العمل.", signedOut: "تم تسجيل الخروج.", invitations: "أحدث الدعوات", noInvites: "لا توجد دعوات بعد.", pending: "قيد الانتظار", accepted: "مقبولة", expired: "منتهية", revoked: "ملغاة", status: "الحالة", expires: "تنتهي", revoke: "إلغاء الدعوة", teamMembers: "المتطوعون الحاليون", active: "نشط", suspended: "معلّق", revokedStatus: "ملغى", save: "حفظ التغييرات", saved: "تم تحديث صلاحية المتطوع.", language: "English", login: "دخول المتطوعين", permissionNote: "يحدد دورك الأدوات المتاحة. يتحقق الخادم من الصلاحيات في كل طلب محمي." }
} satisfies Record<Locale, Record<string, string>>;

async function getCsrf() {
  const response = await fetch(`${API_BASE}/api/v1/volunteer/csrf/`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("CSRF unavailable");
  return (await response.json() as { csrfToken: string }).csrfToken;
}

export default function DashboardClient({ locale }: { locale: Locale }) {
  const copy = t[locale];
  const [data, setData] = useState<DashboardData | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamEdits, setTeamEdits] = useState<Record<number, TeamEdit>>({});
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CONTRIBUTOR");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/volunteer/dashboard/`, { credentials: "include", cache: "no-store" });
      if (response.status === 401 || response.status === 403) { setData(null); return; }
      if (!response.ok) throw new Error(copy.error);
      setData(await response.json() as DashboardData);
    } catch (err) { setError(err instanceof Error ? err.message : copy.error); }
    finally { setLoading(false); }
  }, [copy.error]);

  const loadInvitations = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/v1/volunteer/invitations/`, { credentials: "include", cache: "no-store" });
    if (response.ok) { const body = await response.json() as { results: Invitation[] }; setInvitations(body.results); }
  }, []);

  const loadTeam = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/v1/volunteer/team/`, { credentials: "include", cache: "no-store" });
    if (response.ok) {
      const body = await response.json() as { results: TeamMember[] };
      setTeamMembers(body.results);
      setTeamEdits(body.results.reduce<Record<number, TeamEdit>>((acc, member) => { acc[member.id] = { role: member.role, status: member.status }; return acc; }, {}));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (data?.capabilities.can_manage_team) { void loadInvitations(); void loadTeam(); } }, [data, loadInvitations, loadTeam]);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const csrf = await getCsrf();
      const response = await fetch(`${API_BASE}/api/v1/volunteer/invitations/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrf }, body: JSON.stringify({ email, role, locale }) });
      const body = await response.json().catch(() => ({})) as { detail?: string; invitation_url?: string };
      if (!response.ok) throw new Error(body.detail || copy.error);
      setMessage(body.invitation_url ? `${copy.inviteCreated} ${window.location.origin}${body.invitation_url}` : copy.inviteCreated);
      setEmail(""); await loadInvitations();
    } catch (err) { setError(err instanceof Error ? err.message : copy.error); }
    finally { setBusy(false); }
  }

  async function revokeInvitation(id: number) {
    setError(""); setMessage("");
    try {
      const csrf = await getCsrf();
      const response = await fetch(`${API_BASE}/api/v1/volunteer/invitations/${id}/revoke/`, { method: "POST", credentials: "include", headers: { "X-CSRFToken": csrf } });
      const body = await response.json().catch(() => ({})) as { detail?: string };
      if (!response.ok) throw new Error(body.detail || copy.error);
      setMessage(copy.revoke);
      await loadInvitations();
    } catch (err) { setError(err instanceof Error ? err.message : copy.error); }
  }

  async function updateTeamMember(id: number) {
    setError(""); setMessage("");
    try {
      const csrf = await getCsrf();
      const edit = teamEdits[id];
      const response = await fetch(`${API_BASE}/api/v1/volunteer/team/${id}/update/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRFToken": csrf }, body: JSON.stringify(edit) });
      const body = await response.json().catch(() => ({})) as { detail?: string };
      if (!response.ok) throw new Error(body.detail || copy.error);
      setMessage(copy.saved); await loadTeam();
    } catch (err) { setError(err instanceof Error ? err.message : copy.error); }
  }

  async function signOut() {
    setError("");
    try {
      const csrf = await getCsrf();
      await fetch(`${API_BASE}/api/v1/volunteer/auth/logout/`, { method: "POST", credentials: "include", headers: { "X-CSRFToken": csrf } });
    } finally { window.location.assign(`/${locale}/volunteer/sign-in`); }
  }

  if (loading) return <div className={styles.card} aria-busy="true">{copy.loading}</div>;
  if (!data) return <section className={styles.card}><div className={styles.eyebrow}>FURSA VOLUNTEERS</div><h1>{copy.login}</h1><p className={styles.intro}>{error || copy.error}</p><Link className={styles.primaryLink} href={`/${locale}/volunteer/sign-in`}>{copy.login}</Link></section>;

  const roleLabel = data.user.role === "ADMIN" ? copy.admin : data.user.role === "REVIEWER" ? copy.reviewer : copy.contributor;
  return <section className={styles.dashboardWrap}>
    <header className={styles.dashboardHeader}>
      <div className={styles.headerActions}><button type="button" className={styles.secondaryButton} onClick={signOut}>{copy.signout}</button></div>
    </header>
    <div className={styles.dashboardIntro}><div><span className={styles.eyebrow}>{copy.overview}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div><div className={styles.userChip}><span className={styles.avatar}>{data.user.name.slice(0, 1).toUpperCase()}</span><span><strong>{data.user.name}</strong><small>{data.user.email}</small></span><span className={styles.rolePill}>{roleLabel}</span></div></div>
    <p className={styles.permissionNote}>{copy.permissionNote}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.notice} role="status">{message}</p>}
    <div className={styles.moduleGrid}>
      {data.capabilities.can_submit_vacancies && <article className={styles.moduleCard}><span className={styles.moduleIcon}>↗</span><h2>{copy.submissions}</h2><p>{copy.submissionsText}</p><span className={styles.moduleStatus}>Phase 4A · Foundation</span></article>}
      {data.capabilities.can_review_vacancies && <article className={styles.moduleCard}><span className={styles.moduleIcon}>✓</span><h2>{copy.review}</h2><p>{copy.reviewText}</p><span className={styles.moduleStatus}>Phase 4B · Planned</span></article>}
      {data.capabilities.can_review_vacancies && <article className={styles.moduleCard}><span className={styles.moduleIcon}>⚑</span><h2>{copy.reports}</h2><p>{copy.reportsText}</p><span className={styles.moduleStatus}>Phase 4B · Planned</span></article>}
    </div>
    {data.capabilities.can_manage_team && <section className={styles.teamPanel}><div><span className={styles.eyebrow}>{copy.team}</span><h2>{copy.team}</h2><p>{copy.teamText}</p></div>
      <form className={styles.inviteForm} onSubmit={createInvitation}><label>{copy.email}<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} dir="ltr" /></label><label>{copy.role}<select value={role} onChange={e => setRole(e.target.value)}><option value="CONTRIBUTOR">{copy.contributor}</option><option value="REVIEWER">{copy.reviewer}</option><option value="ADMIN">{copy.admin}</option></select></label><button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? copy.sending : copy.invite}</button></form>
      <div className={styles.invitationList}><h3>{copy.teamMembers}</h3>{teamMembers.length === 0 ? <p>{copy.noInvites}</p> : <div className={styles.tableScroll}><table><thead><tr><th>{copy.email}</th><th>{copy.role}</th><th>{copy.status}</th><th>{copy.save}</th></tr></thead><tbody>{teamMembers.map(member => { const edit = teamEdits[member.id] || { role: member.role, status: member.status }; return <tr key={member.id}><td dir="ltr">{member.email}</td><td><select aria-label={`${copy.role}: ${member.email}`} value={edit.role} onChange={event => setTeamEdits(old => ({ ...old, [member.id]: { ...edit, role: event.target.value } }))}><option value="CONTRIBUTOR">{copy.contributor}</option><option value="REVIEWER">{copy.reviewer}</option><option value="ADMIN">{copy.admin}</option></select></td><td><select aria-label={`${copy.status}: ${member.email}`} value={edit.status} onChange={event => setTeamEdits(old => ({ ...old, [member.id]: { ...edit, status: event.target.value } }))}><option value="ACTIVE">{copy.active}</option><option value="SUSPENDED">{copy.suspended}</option><option value="REVOKED">{copy.revokedStatus}</option></select></td><td><button type="button" className={styles.tableAction} onClick={() => void updateTeamMember(member.id)}>{copy.save}</button></td></tr>; })}</tbody></table></div>}</div>
      <div className={styles.invitationList}><h3>{copy.invitations}</h3>{invitations.length === 0 ? <p>{copy.noInvites}</p> : <div className={styles.tableScroll}><table><thead><tr><th>{copy.email}</th><th>{copy.role}</th><th>{copy.status}</th><th>{copy.expires}</th><th>{copy.revoke}</th></tr></thead><tbody>{invitations.map(item => <tr key={item.id}><td dir="ltr">{item.email}</td><td>{item.role === "ADMIN" ? copy.admin : item.role === "REVIEWER" ? copy.reviewer : copy.contributor}</td><td>{item.status === "accepted" ? copy.accepted : item.status === "expired" ? copy.expired : item.status === "revoked" ? copy.revoked : copy.pending}</td><td>{new Date(item.expires_at).toLocaleDateString(locale === "ar" ? "ar" : "en")}</td><td>{item.status === "pending" ? <button type="button" className={styles.tableAction} onClick={() => void revokeInvitation(item.id)}>{copy.revoke}</button> : "—"}</td></tr>)}</tbody></table></div>}</div>
    </section>}
  </section>;
}
