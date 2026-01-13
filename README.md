# NextUp

NextUp is a web application for groups of friends to track what games everyone is playing, share favorites/wishlists/backlogs, discover upcoming games that match the group's collective interests, and optionally receive deal alerts with purchase links.

## Features

- **User Authentication**: Email/password and Google OAuth login
- **Groups**: Create gaming groups, invite friends via shareable links
- **Game Library**: Search and add games from IGDB database
- **Personal Lists**: Track games with statuses (Now Playing, Finished, Dropped, Backlog, Wishlist, Favorite)
- **Group Dashboard**: See what friends are playing, most wanted games, and recent additions
- **Upcoming Discovery**: Get personalized recommendations based on group preferences
- **Deal Alerts**: Get notified when wishlisted games go on sale

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis (BullMQ for background jobs)
- **Authentication**: NextAuth.js (Auth.js)
- **External APIs**: IGDB (game data), IsThereAnyDeal (deals)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis server
- API credentials:
  - IGDB (Twitch Client ID and Secret)
  - IsThereAnyDeal API key
  - Google OAuth credentials (optional)
  - SMTP credentials (optional, for emails)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nextup
   ```

2. Run the setup script:
   ```bash
   ./init.sh
   ```

   Or with Docker for databases:
   ```bash
   ./init.sh --with-docker
   ```

3. Configure your environment variables in `.env`

4. Access the application at `http://localhost:3000`

## Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. Set up the database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
nextup/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── ...          # Feature components
│   ├── lib/             # Utilities and helpers
│   │   ├── auth/        # Authentication utilities
│   │   ├── db/          # Database client and queries
│   │   ├── api/         # External API clients (IGDB, ITAD)
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   └── styles/          # Global styles
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── ...
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Session encryption secret | Yes |
| `TWITCH_CLIENT_ID` | IGDB API client ID | Yes |
| `TWITCH_CLIENT_SECRET` | IGDB API client secret | Yes |
| `ITAD_API_KEY` | IsThereAnyDeal API key | For deals |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Optional |
| `SMTP_*` | Email configuration | Optional |

## API Keys Setup Guide

### Required API Keys

#### 1. IGDB (Twitch) - Game Database
**Required for:** Game search, game details, upcoming releases

1. Go to https://dev.twitch.tv/console
2. Log in with your Twitch account (create one if needed)
3. Click "Register Your Application"
4. Fill in:
   - Name: "NextUp" (or your app name)
   - OAuth Redirect URLs: `http://localhost:3000` (for development)
   - Category: "Website Integration"
5. Click "Create"
6. Copy your **Client ID** → `TWITCH_CLIENT_ID`
7. Click "New Secret" and copy it → `TWITCH_CLIENT_SECRET`

**Note:** IGDB uses Twitch authentication. The tokens auto-refresh, no manual renewal needed.

#### 2. IsThereAnyDeal (ITAD) - Game Deals
**Required for:** Price comparisons, deal alerts, historical price data

1. Go to https://isthereanydeal.com/dev/app/
2. Create an account or log in
3. Click "Create new app"
4. Fill in your app details
5. Copy your API key → `ITAD_API_KEY`

**Note:** Free tier has rate limits. Check their docs for current limits.

### Optional API Keys

#### 3. Google OAuth - Social Login
**Required for:** "Sign in with Google" functionality

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Configure the OAuth consent screen if prompted
6. Select "Web application" as application type
7. Add Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
8. Copy credentials:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

#### 4. SMTP - Email Notifications
**Required for:** Password reset emails, deal alerts, notifications

You can use any SMTP provider. Common options:

**SendGrid (Free tier: 100 emails/day)**
1. Sign up at https://sendgrid.com/
2. Go to Settings → API Keys → Create API Key
3. Configure:
   - `SMTP_HOST=smtp.sendgrid.net`
   - `SMTP_PORT=587`
   - `SMTP_USER=apikey`
   - `SMTP_PASSWORD=your_api_key`

**Gmail (For development)**
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password
4. Configure:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your_email@gmail.com`
   - `SMTP_PASSWORD=your_app_password`

**Mailgun, Postmark, AWS SES** - Similar setup, check their documentation.

### Development Without API Keys

The app can run in a limited mode without external API keys:

- **Without IGDB**: Game search uses sample/cached data
- **Without ITAD**: Deal features disabled, no price comparisons
- **Without Google OAuth**: Only email/password login available
- **Without SMTP**: Emails logged to console instead of sent

### Verifying Your Setup

After configuring API keys, test each integration:

```bash
# Start the dev server
npm run dev

# Test IGDB - Search should return real results
# Visit: http://localhost:3000/search and search for a game

# Test Google OAuth - Should show Google button
# Visit: http://localhost:3000/login

# Test SMTP - Should log or send email
# Visit: http://localhost:3000/forgot-password
```

## Background Jobs

The application uses BullMQ for scheduled jobs:

- **sync-upcoming-releases**: Nightly at 2am - Fetches upcoming games from IGDB
- **compute-interest-profiles**: Nightly at 3am - Recalculates group interest profiles
- **generate-recommendations**: Nightly at 4am - Scores and stores recommendations
- **sync-deals**: Every 6 hours - Fetches deals from IsThereAnyDeal
- **send-deal-notifications**: Continuous - Processes notification queue

## Development

```bash
# Run development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Lint code
npm run lint

# Run tests
npm run test
```

## Deployment

### Railway (Recommended for Free Hosting)

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Create a new project** and add these services:
   - PostgreSQL database
   - Redis database
   - Web service (connect your GitHub repo)

3. **Configure environment variables** in the web service:
   ```
   DATABASE_URL=${DATABASE_URL}
   REDIS_URL=${REDIS_URL}
   NEXTAUTH_URL=https://your-app.railway.app
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   TWITCH_CLIENT_ID=<your-twitch-client-id>
   TWITCH_CLIENT_SECRET=<your-twitch-client-secret>
   ITAD_API_KEY=<your-itad-api-key>
   GOOGLE_CLIENT_ID=<optional>
   GOOGLE_CLIENT_SECRET=<optional>
   ```

4. **Deploy**: Railway will automatically build and deploy on push to main branch

5. **Run migrations**: In Railway dashboard, open the service shell:
   ```bash
   npx prisma migrate deploy
   ```

**Note**: Railway's free tier includes:
- $5 of usage per month
- PostgreSQL database
- Redis database
- Automatic HTTPS
- Custom domains

### Docker Production

```bash
# Build and run full stack
docker compose --profile full up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

## License

MIT
