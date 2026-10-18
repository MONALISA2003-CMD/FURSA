import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const exists = async (path) => access(resolve(root, path));
const fail = (message) => { throw new Error(`[FURSA Phase 2 contract] ${message}`); };

const [packageJson, rootLayout, brandTokens, globalCss, localeLayout, localeCss, home, results, detail, header, jobsCss] = await Promise.all([
  read("package.json"),
  read("app/layout.tsx"),
  read("app/brand-tokens.css"),
  read("app/globals.css"),
  read("app/[locale]/layout.tsx"),
  read("app/[locale]/fursa-ui.css"),
  read("app/[locale]/HomeContent.tsx"),
  read("app/[locale]/jobs/JobResults.tsx"),
  read("app/[locale]/jobs/[id]/JobDetailClient.tsx"),
  read("app/[locale]/components/SiteChrome.tsx"),
  read("app/[locale]/jobs/jobs.css"),
]);

// `read()` returns file contents as text; parse package.json before inspecting scripts.
const packageConfig = JSON.parse(packageJson);
assert.equal(packageConfig.scripts?.prebuild, "node scripts/phase2-contract-check.mjs", "prebuild contract check must be wired to npm run build");
assert.equal(packageConfig.scripts?.postbuild, "node scripts/phase2-route-smoke.mjs", "postbuild route smoke check must be wired to npm run build");
assert.match(rootLayout, /\.\/globals\.css/);
assert.match(rootLayout, /\.\/brand-tokens\.css/);
assert.match(localeLayout, /\.\/phase2-acceptance\.css/);

for (const [token, value] of [["--brand-blue", "#1746c8"], ["--brand-coral", "#ff4f5e"], ["--brand-coral-text", "#c8293d"], ["--brand-deep-navy", "#10264f"]]) {
  if (!brandTokens.toLowerCase().includes(`${token}: ${value}`)) fail(`missing/changed approved token ${token} ${value}`);
}
if (!globalCss.includes("var(--brand-deep-navy") || /--teal:\s*#(?:16a69a|0f817b)/i.test(globalCss)) {
  fail("global CSS still declares the old teal palette instead of using canonical brand tokens");
}
if (!globalCss.includes("prefers-reduced-motion") || !globalCss.includes(":focus-visible")) fail("global accessibility styles are missing");
if (!localeCss.includes("--brand-blue") || !localeCss.includes("prefers-reduced-motion")) fail("brand UI tokens or reduced-motion styles are missing");

for (const url of ["/api/v1/countries/", "/api/v1/categories/"]) {
  if (!home.includes(url)) fail(`homepage must load reference data from ${url}`);
}
for (const code of ["ae", "sa", "qa", "kw", "bh"]) {
  const flagPath = `public/flags/${code}.svg`;
  await exists(flagPath).catch(() => fail(`required local flag is missing: ${flagPath}`));
  const svg = await read(flagPath);
  if (!/<svg[\s>]/i.test(svg)) fail(`flag is not a valid SVG document: ${flagPath}`);
}
for (const slug of ["administration", "construction", "customer-service", "engineering", "finance-accounting", "healthcare", "hospitality", "it-software", "logistics-warehouse", "sales-marketing", "skilled-trades"]) {
  if (!home.includes(slug)) fail(`homepage icon map is missing category slug ${slug}`);
}
if (!home.includes("LOCAL_FLAG_CODES") || !home.includes("referenceStatus === \"error\"") || !home.includes("retryReferenceData")) fail("homepage reference-data resilience is incomplete");
if (!home.includes("/jobs?country=") || !home.includes("/jobs?category=")) fail("homepage country/category cards must link to the existing query-parameter contract");

for (const marker of ["role={filtersOpen ? \"dialog\"", "aria-modal", "Escape", "filterToggleRef", "filterPanelRef", "URLSearchParams", "returnTo", "page_size", "FLAG_SRC", "emptyCatalogTitle"]) {
  if (!results.includes(marker)) fail(`job search is missing expected behaviour marker: ${marker}`);
}
for (const marker of ["safeDestination", "https:", "mailto:", "wa.me", "api.whatsapp.com", "originalDate", "lastChecked", "sourceAndFreshness", "noRoute", "lang={locale}", "dir={isArabic ? \"rtl\" : \"ltr\"}"]) {
  if (!detail.includes(marker)) fail(`job detail is missing expected safety/localisation marker: ${marker}`);
}
for (const marker of ["window.location.search", "window.location.hash", "Escape", "aria-expanded", "document.documentElement.lang", "document.documentElement.dir"]) {
  if (!header.includes(marker)) fail(`shared navigation is missing expected accessibility/localisation marker: ${marker}`);
}
for (const marker of ["@media (max-width: 760px)", "@media (max-width: 560px)", "prefers-reduced-motion", "job-advanced-filter-wrap.is-open"]) {
  if (!jobsCss.includes(marker)) fail(`job responsive styles are missing ${marker}`);
}

function luminance(hex) {
  const s = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
assert.ok(contrast("#1746C8", "#FFFFFF") >= 4.5, "royal blue must meet ordinary-text contrast against white");
assert.ok(contrast("#C8293D", "#FFFFFF") >= 4.5, "accessible coral text token must meet ordinary-text contrast against white");

console.log("FURSA Phase 2 contract checks passed: brand tokens, API-backed homepage references, flags/icons, search filters, detail source safety, bilingual navigation, responsive styles, and contrast tokens.");
