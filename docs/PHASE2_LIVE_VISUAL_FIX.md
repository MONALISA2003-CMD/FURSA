# FURSA Phase 2 — Live Visual Fix: Header/Footer Identity and Saudi Flag

**Scope:** Focused visual correction after reviewing the provided mobile screen recording of `https://fursa-web-a2ot.onrender.com/ar#countries`.

## Problems addressed

1. **Header and footer wordmarks retained legacy colours.** The shared text marks still inherited the older teal/navy variables while the official main logo used the selected Royal Blue + Coral Red palette. The acceptance stylesheet now explicitly sets both English and Arabic wordmarks to Royal Blue. The compact blue/coral mark and browser icon are re-applied from the approved Increment 1 logo assets.
2. **Saudi flag calligraphy rendered incorrectly in the old SVG.** The old asset used very small Arabic text lines and was not visually faithful at normal UI sizes. The replacement is a self-contained SVG with a correctly shaped, high-resolution Arabic shahada layer and a white sword beneath it. It uses no external runtime image request.
3. **Country/category labels broke inside words on mobile.** The previous acceptance rule applied `overflow-wrap: anywhere`, causing labels such as “United Arab Emirates” and “Logistics & Warehousing” to split mid-word. The new scoped override restores natural word-boundary wrapping while preserving mixed-direction handling.

## Changes in this bundle

- `apps/web/app/[locale]/phase2-acceptance.css`
- `apps/web/public/brand/fursa-mark.png`
- `apps/web/app/icon.png`
- `apps/web/public/flags/sa.svg`
- `docs/PHASE2_LIVE_VISUAL_FIX.md`

No workflow, package, backend, database, or hosting configuration is changed.

## Screen recording review: additional items to verify/fix

### Addressed here
- Header/footer wordmark colour consistency.
- Correct Saudi flag rendering.
- Word wrapping in country/category cards.

### Still worth checking during live acceptance
- Some country and category cards are dense on narrow screens. After natural wrapping is restored, check at 320px, 360px, and 390px widths; if long labels still feel crowded, use a one-column category list below a defined breakpoint rather than reducing font size further.
- Confirm the search hero stays the first priority and the stacked logo panel does not push the main action too far down on phones.
- Check the mobile navigation open/close control and language switch without relying on browser auto-translation.
- Validate the empty-catalogue page states separately from API errors; the catalogue is currently empty, so detail-page behaviour still needs a genuine reviewed test vacancy.
- Verify all five flag/card links and all eleven category filters retain correct query parameters.
- Check actual contrast on primary buttons, link hover/focus styles, and selected filters against WCAG 2.2 AA targets.

The visible “Translate” panel in the supplied recording appears to be the mobile browser's translation UI, not a component rendered by FURSA; test the Arabic page with automatic browser translation disabled to assess the native RTL layout.

## Validation

- Saudi SVG parsed as XML and contains no external image URL or script.
- Country flag artwork previewed at high resolution and downscaled UI size.
- New CSS was appended to the Phase 2 acceptance CSS rather than replacing its prior test and RTL rules.
- GitHub Actions must still run the full Django checks, frontend typecheck, production build, route smoke tests, and deployment check after this ZIP is uploaded.

## Design references

- Approved FURSA palette: Royal Blue `#1746C8`, Coral `#FF4F5E`, Deep Navy `#10264F`.
- Official logo composition and English/Arabic lettering remain unchanged; this patch re-applies the already recoloured compact mark.
