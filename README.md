# HHH-FINANCE

HHH-FINANCE is a mobile-first finance dashboard for Heart Health Hub.

It helps track:

- orders and invoices
- bonus income
- products and pricing
- expenses
- assets
- liabilities
- monthly income, profit, and founder salary

The app is a Progressive Web App, so it can be installed on a phone or laptop from the browser.

## Live App

https://hhh-finance.netlify.app

## Tech

- Plain HTML, CSS, and JavaScript
- Supabase for shared data and email/password authentication
- Netlify for hosting
- PWA manifest and service worker for installable app behavior

## Local Preview

From this folder, run a simple static server:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173
```

## Onboarding Video

The mobile onboarding video is saved at:

```text
videos/hhh-finance-onboarding.mp4
```

The Remotion composition is in `remotion/`. A fallback renderer script is in `scripts/render_onboarding_video.py`.

## Notes

Supabase sync is built into the app with a public publishable key. Row-level security keeps the shared business records available only to approved signed-in members.

Orders can be opened from the Orders table, reviewed in full, edited, and saved back to the same order number. Bonus income is tracked separately from orders, then included in monthly income, net profit, and the 15% founder salary calculation.
