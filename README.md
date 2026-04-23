# Market Signals Landing Page

**[🔗 Live Site: getstreetinsights.com](https://getstreetinsights.com)**

Marketing landing page for Market Signals — stock sentiment tracking platform with credibility-weighted source analysis.

## Features

- Modern, conversion-optimized landing page
- Waitlist signup with Supabase backend
- Stripe payment integration (coming soon)
- Fast static site generation with Astro

## Tech Stack

- **Framework:** Astro 6
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (waitlist, user management)
- **Payments:** Stripe (subscriptions)
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Add your Supabase and Stripe keys

# Start dev server
npm run dev
```

Visit `http://localhost:4321`

## Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL | supabase.com |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | supabase.com |
| `STRIPE_SECRET_KEY` | Stripe secret key | stripe.com |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | stripe.com |

## Database Setup

Run the SQL schema in `waitlist.sql` to create the waitlist table in your Supabase project.

## Scripts

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## Related Repositories

- [market-signals](https://github.com/patrickboxfordpartners/market-signals) - Main application repository

## License

Private - Boxford Partners
