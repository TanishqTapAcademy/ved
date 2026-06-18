# VedSphere Site Redesign — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design), pending implementation
**Scope:** Visual / motion / consistency overhaul of the existing single-file marketing site.

## Goal

Take the existing `index.html` (a Salesforce Revenue Cloud & CPQ partner landing page)
and make it modern, consistent, gradient-rich, and interactive — without changing the
fonts, the copy, the section structure, or the tech stack.

Direction: **"Vibrant Modern SaaS"** — an evolution of the current navy/blue/teal look,
not a reinvention.

## Hard Constraints (do NOT violate)

1. **No font changes.** Keep Sora (headings) + Plus Jakarta Sans (body).
2. **No framework.** Stays a single static `index.html`. No React/build step.
   Motion via **GSAP + ScrollTrigger** loaded from CDN, plus CSS.
3. **No copy rewrites.** Headlines, paragraphs, list items, FAQ text stay as-is.
4. **No new or removed sections.** Same sections in the same order.
5. Keep the existing cobe globe (`cobe.min.js` / `phenomenon.min.js`) working.
6. All motion must respect `prefers-reduced-motion`.
7. Site must still work when opened via `file://` (classic scripts, no ES modules
   that break file access; CDN scripts are fine for the hosted build).

## 1. Design System (foundation — build first)

Replace ad-hoc inline `font-size` / `margin` overrides with a strict token layer in
`:root`. After this, **no element sets `font-size` inline**; all type uses a scale class
or token.

### Type scale (Sora for headings, Jakarta for body)
| Token | Use | Size (clamp) | Line-height | Tracking | Weight |
|-------|-----|--------------|-------------|----------|--------|
| `--fs-display` | hero h1 | clamp(2.5rem, 5.2vw, 4rem) | 1.05 | -.035em | 800 |
| `--fs-h2` | section titles | clamp(2rem, 3.6vw, 2.85rem) | 1.1 | -.02em | 700 |
| `--fs-h3` | card titles | 1.2rem | 1.2 | -.01em | 700 |
| `--fs-h4` | sub-items | 1.08rem | 1.3 | -.01em | 700 |
| `--fs-lead` | hero/section lead | 1.12rem | 1.6 | 0 | 400 |
| `--fs-body` | default | .95rem | 1.6 | 0 | 400 |
| `--fs-sm` | meta/list | .86rem | 1.5 | 0 | 500 |
| `--fs-eyebrow` | eyebrows | .74rem | 1 | .18em | 700 |

Card titles, list text, prices, etc. all map to these — the current mix of `1.6rem`,
`1.18rem`, `1.4rem`, `1.06rem` collapses into the scale above.

### Spacing scale (8pt)
`--sp-1:4px … --sp-2:8px … --sp-3:12px … --sp-4:16px … --sp-6:24px … --sp-8:32px …
--sp-12:48px … --sp-16:64px … --sp-24:96px`. Section vertical padding standardizes to
`--sp-24` desktop / `--sp-16` tablet / 68px mobile. All grid gaps use the scale.

### Gradient + glow tokens
- `--grad-brand`: blue→teal (existing accent, reused everywhere consistently).
- `--grad-aurora-dark`: layered radial mesh for dark sections (hero / revenue-cloud / CTA).
- `--grad-wash-light`: soft tinted wash for light sections (replaces flat grey).
- `--grad-border`: gradient border treatment for cards.
- `--glow-blue`, `--glow-teal`: reusable box-shadow glows.

## 2. Visual Treatment

- **Dark sections:** aurora mesh background + subtle animated glow drift; glassmorphism
  panels (existing hero-panel style, refined and reused).
- **Light sections:** `--grad-wash-light` instead of flat `--mist`; cards get gradient
  hairline borders and a soft glow on hover.
- **Cards (services, packages, process):** unified hover — lift + gradient-glow border +
  animated top accent bar (the `::after` scaleX already exists; standardize it).
- **Gradient text** on one key phrase per dark section (already on hero; apply tastefully).
- **Alignment:** every section uses the same `.wrap` max-width and padding; section heads
  use one consistent component; grids align to the spacing scale.

## 3. Interaction Layer

- **Buttons:** magnetic hover (cursor-follow translate) + sheen sweep on `.btn` / `.pkg-cta`.
- **Cards:** smooth lift, gradient border reveal, accent bar.
- **Trust stats:** count-up animation on scroll-in (respect reduced-motion → show final).
- **Nav:** refined scroll background state (exists) + active-section link highlight via
  ScrollTrigger.
- **FAQ:** keep accordion; smooth height + icon rotate (exists, polish timing).
- **Globe:** subtle parallax/opacity tie to scroll.

## 4. Motion Layer (GSAP + ScrollTrigger)

- Load GSAP + ScrollTrigger from CDN (hosted); keep a graceful fallback so content is
  visible if GSAP fails to load (no permanently-hidden elements).
- **Hero load:** timeline staggering headline → lead → actions → (globe fade).
- **Per-section:** ScrollTrigger batched staggered reveals replacing the current
  IntersectionObserver `.reveal` system; parallax depth on dark-section backgrounds.
- Reduced-motion: disable transforms/parallax, snap elements to final state.

## 5. Execution Order (section by section)

1. **Design-system tokens + global base** (type scale, spacing, gradients, motion setup).
2. Nav  3. Hero  4. Trust bar  5. Approach  6. Services  7. Revenue Cloud spotlight
8. Packages  9. Process  10. FAQ  11. CTA/Contact  12. Footer.

Each section: apply tokens (kill inline sizes), apply visual treatment, wire motion.
Subagents may be dispatched per section against the shared token layer once step 1 is
locked.

## Success Criteria

- No inline `font-size` / ad-hoc spacing remain; all type maps to the scale.
- Consistent section rhythm and alignment across the whole page.
- Gradients and interactions feel cohesive (shared tokens, not one-offs).
- GSAP-driven entrance + scroll motion, smooth at 60fps, reduced-motion safe.
- Fonts, copy, sections, and globe unchanged and functional.
- Page still loads correctly on Vercel and via `file://`.
