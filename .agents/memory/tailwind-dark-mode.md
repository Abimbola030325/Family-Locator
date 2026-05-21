---
name: Tailwind v4 dark mode
description: How dark mode is configured in this project (no tailwind.config.ts, CSS-first config)
---

This project uses Tailwind v4 (CSS-first config). There is no `tailwind.config.ts` — dark mode is configured in `artifacts/life360-app/src/index.css` via:

```css
@custom-variant dark (&:is(.dark *));
```

**How to apply:** Toggle the `dark` class on `document.documentElement` (the `<html>` element). All child elements will then match `dark:` utility classes.

**Implementation:** `ThemeProvider` in `artifacts/life360-app/src/context/ThemeContext.tsx` reads from localStorage (`wyd_theme`), applies to `document.documentElement.classList`, and falls back to `prefers-color-scheme`. The `useTheme()` hook exposes `{ theme, toggle }` to any component.

**Why:** Tailwind v4 removed the `tailwind.config.js` `darkMode: 'class'` option in favor of CSS-native custom variants.
