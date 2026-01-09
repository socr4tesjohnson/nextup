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

## License

MIT
