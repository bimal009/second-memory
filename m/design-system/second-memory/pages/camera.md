# Camera Page Overrides

> **PROJECT:** Second Memory
> **Generated:** 2026-10-30 11:07:16
> **Page Type:** Native camera capture surface (reviewed override)

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- Full-bleed camera preview. Controls sit within device safe areas. Native portrait and landscape support.
- Top: avatar, indicator, flip. Side: 48pt tools with 8pt gaps. Bottom: modes, shutter, labeled navigation.
- Use a three-page horizontal pager, not a dashboard grid. Vertical gesture fails if horizontal movement exceeds 16pt.

### Spacing Overrides

- 4/8pt rhythm. Content gutters 16pt camera, 24pt non-camera. Targets at least 48pt.

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- The user's exact lime tokens in `src/theme/tokens.ts` override MASTER's blue palette.
- Camera always uses dark colors, including in light mode. Text over live preview sits on an 88% black scrim.
- Lime fills and highlights only; use #4D7C0F for light-surface text/icons.

### Component Overrides

- Avoid: Default keyboard for all inputs
- Avoid: Desktop-first causing mobile issues
- Avoid: Enable by default everywhere

---

## Page-Specific Components

- Shutter: tap <180ms saves; 180–349ms does nothing; hold >=350ms starts simulated push-to-talk. Release sends one command.
- Buffer runs only when focused, foreground, permission available, no overlay/session/privacy pause. Display the reason whenever paused.
- Session is a separate simulated recorder; its preview is the explicit session exception, and its buffer remains paused.
- 150/200/250/300ms transform/opacity transitions. Respect reduced motion, and keep text scalable.

---

## Recommendations

- Effects: Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading
- Forms: Use inputmode attribute
- Responsive: Start with mobile styles then add breakpoints
- Touch: Disable where not needed
