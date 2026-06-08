# HHH-FINANCE

HHH-FINANCE is a mobile-first finance dashboard for Heart Health Hub.

It helps track:

- orders and invoices
- products and pricing
- expenses
- assets
- liabilities
- monthly revenue, profit, and spendable cash

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

## Notes

The Supabase anon key is intentionally not hard-coded in this repo. Add it in the app's Settings screen when connecting a browser/device.
