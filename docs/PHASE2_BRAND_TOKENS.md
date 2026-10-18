# FURSA Phase 2 — Brand Tokens (Increment 1)

**Status:** Implemented in the Increment 1 bundle; pending GitHub Actions validation and deployment review.

## Selected visual identity

FURSA's approved direction is **Royal Blue + Coral Red**. The original logo artwork was recoloured at the pixel level to preserve its supplied shapes, English wordmark, and Arabic lettering.

| Token | Value | Use |
|---|---|---|
| `--brand-blue` | `#1746C8` | Primary brand, links, primary buttons, focus ring |
| `--brand-blue-hover` | `#1239A6` | Hover state for primary actions |
| `--brand-blue-soft` | `#EDF3FF` | Soft blue surfaces |
| `--brand-coral` | `#FF4F5E` | Main logo accent and decorative accents |
| `--brand-coral-text` | `#C8293D` | Coral-coloured text or controls requiring stronger contrast |
| `--brand-coral-soft` | `#FFF0F1` | Pale coral surfaces |
| `--brand-deep-navy` | `#10264F` | Primary text and dark panels |
| `--brand-muted` | `#566780` | Secondary text and metadata |
| `--brand-line` | `#DCE4F0` | Borders and dividers |
| `--brand-neutral-soft` | `#F5F7FC` | Neutral surface |
| `--brand-white` | `#FFFFFF` | Primary surface |

## Contrast rule

The selected bright coral `#FF4F5E` has approximately **3.21:1** contrast against white. It is reserved for logo artwork, decorative highlights, and qualifying non-text uses; do not use it for ordinary small text on white. Use `#C8293D` for coral text on white (approximately **5.47:1**). Royal blue `#1746C8` has approximately **7.65:1** contrast against white. Verify all actual component states and backgrounds before release.

The target is WCAG 2.2 AA for the core public experience. These token calculations are useful checks, not a declaration of full WCAG conformance.

## Asset policy

- `apps/web/public/brand/fursa-logo.png` is the full, recoloured stacked logo.
- `apps/web/public/brand/fursa-mark.png` is the cropped symbol-only asset for compact placements.
- `apps/web/app/icon.png` is the square symbol treatment for the browser/app icon.
- Preserve the supplied geometry and Arabic lettering; do not replace official artwork with a generated redraw.
- Keep the original logo available as a source-of-truth backup outside the deployed UI assets.

## CSS implementation

`apps/web/app/brand-tokens.css` is the canonical token source. Existing component variable names are retained as compatibility aliases, so this increment does not needlessly rewrite search and detail component behaviour. The locale styles map their current token names to the canonical values. The Arabic and English wordmarks use the same royal blue; coral is reserved for the emblem's accent and selected decorative elements.

## Scope and validation

This increment establishes tokens and applies the palette to the current brand CSS and logo assets. It does **not** yet implement country flags, category icon replacements, filter-drawer behaviour, or the full visual refinements in the broader Phase 2 specification.

Validation required after bundle upload:

1. GitHub Actions Django checks/tests and frontend typecheck/build pass.
2. Render deploys the resulting commit.
3. Inspect `/en` and `/ar`, the header/footer mark, browser icon, primary buttons, hover/focus states, and small-screen layout.
4. Adjust any contrast or visual issues before proceeding to Increment 2.

## Reference

- W3C Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/
