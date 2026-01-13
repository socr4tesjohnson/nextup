# NextUp - GitHub & Railway Deployment Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `nextup` (or your preferred name)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Step 2: Push to GitHub

Run these commands in your terminal:

```powershell
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/nextup.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Railway

### A. Sign Up & Create Project

1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your `nextup` repository

### B. Add Required Services

After creating the project, add these services:

#### 1. PostgreSQL Database
- Click "+ New"
- Select "Database" → "PostgreSQL"
- Railway will automatically create `DATABASE_URL` variable

#### 2. Redis Database
- Click "+ New"  
- Select "Database" → "Redis"
- Railway will automatically create `REDIS_URL` variable

### C. Configure Environment Variables

In your web service (the one connected to GitHub), go to Variables tab and add:

```bash
# Required - Authentication
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Required - IGDB/Twitch API
TWITCH_CLIENT_ID=<get from https://dev.twitch.tv/console/apps>
TWITCH_CLIENT_SECRET=<get from https://dev.twitch.tv/console/apps>

# Required - Deal Tracking
ITAD_API_KEY=<get from https://isthereanydeal.com/apps/my/>

# Optional - Google OAuth
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>

# Optional - Email (for password reset)
SMTP_HOST=<optional>
SMTP_PORT=587
SMTP_USER=<optional>
SMTP_PASSWORD=<optional>
SMTP_FROM=noreply@yourapp.com

# Auto-configured by Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### D. Run Database Migrations

After first deployment, run migrations:

1. In Railway dashboard, go to your web service
2. Click on "Settings" tab
3. Scroll to "Service Settings" 
4. Open a service shell or add to build command
5. Run: `npx prisma migrate deploy`

Or add to your `package.json` build script:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

## Step 4: Get API Keys

### IGDB (Twitch) API:
1. Go to https://dev.twitch.tv/console/apps
2. Create new application
3. Name: "NextUp" or similar
4. OAuth Redirect URL: https://your-app.railway.app/api/auth/callback/twitch
5. Category: Website Integration
6. Copy Client ID and generate Client Secret

### IsThereAnyDeal API:
1. Go to https://isthereanydeal.com/apps/my/
2. Create account if needed
3. Register new application
4. Copy API key

### Google OAuth (Optional):
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: https://your-app.railway.app/api/auth/callback/google

## Step 5: Update NEXTAUTH_URL

After Railway assigns your domain:

1. Copy your Railway app URL (e.g., `nextup-production.up.railway.app`)
2. Update `NEXTAUTH_URL` in Railway environment variables
3. Update OAuth redirect URLs in Twitch/Google consoles
4. Redeploy the service

## Railway Free Tier Limits

Railway provides **$5 of free usage per month**, which includes:
- Up to 500 hours of execution time
- PostgreSQL database (1GB)
- Redis database
- Automatic HTTPS
- Custom domains (optional)

**Tips to stay within free tier:**
- Set sleep policy after inactivity
- Optimize background jobs
- Use caching effectively

## Troubleshooting

### Build Fails
- Check logs in Railway dashboard
- Ensure all required env variables are set
- Verify Prisma schema is correct

### Database Connection Issues
- Ensure DATABASE_URL is properly referenced: `${{Postgres.DATABASE_URL}}`
- Run migrations: `npx prisma migrate deploy`

### Redis Connection Issues
- Ensure REDIS_URL is properly referenced: `${{Redis.REDIS_URL}}`

### NEXTAUTH Errors
- Verify NEXTAUTH_URL matches your Railway domain
- Ensure NEXTAUTH_SECRET is set (generate with: `openssl rand -base64 32`)

## Monitoring

- View logs: Railway Dashboard → Service → Logs
- Database metrics: Railway Dashboard → PostgreSQL service
- App metrics: Railway Dashboard → Service → Metrics

## Custom Domain (Optional)

1. Go to Railway service → Settings
2. Click "Generate Domain" or add custom domain
3. Update NEXTAUTH_URL to new domain
4. Update OAuth redirect URLs

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
