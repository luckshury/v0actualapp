# Production Setup Options

## Option 1: Simple VPS Setup (Recommended)

### 1. Get a cheap VPS ($5-10/month):
- **DigitalOcean Droplet** - $6/month, 1GB RAM
- **Linode Nanode** - $5/month, 1GB RAM  
- **Vultr** - $6/month, 1GB RAM

### 2. Basic server setup:
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone your repo
git clone <your-repo>
cd <your-repo>
npm install
npm run build

# Start with PM2 (keeps running)
pm2 start npm --name "crypto-screener" -- start
pm2 startup
pm2 save
```

### 3. Use Caddy for HTTPS (super easy):
```bash
sudo apt install caddy
```

Create `/etc/caddy/Caddyfile`:
```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

## Option 2: Vercel (Zero Config)

Just push to GitHub and deploy on Vercel:
- Free tier handles the Next.js app
- API routes handle REST API calls
- Automatic HTTPS and CDN

**Note: WebSocket functionality has been removed from this application. All data is now fetched via REST API polling.**

## Database (if needed later)

If you want to store data:
- **SQLite** - File-based, zero config
- **Supabase** - PostgreSQL as a service, free tier
- **PlanetScale** - MySQL as a service, free tier

## Current Setup is Production Ready

Your current setup actually works fine for production as-is:
- Next.js handles the frontend and API routes
- REST API polling for live data updates
- Charts are optimized for speed
- No database needed for live data

Just deploy to Vercel or a VPS and you're good to go!