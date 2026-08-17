# 🚀 StitchMatch - Complete Production Deployment & Hosting Guide

This guide provides step-by-step instructions for deploying StitchMatch to production, connecting your custom domain, enabling SSL, and running the platform.

---

## 📑 Deployment Options

| Option | Best For | Cost | Setup Time |
| :--- | :--- | :---: | :---: |
| **Option A: Free Cloud Stack (Vercel + Render + Aiven)** | Staging & Client Testing | **100% FREE** | ~10 mins |
| **Option B: Dedicated VPS (Ubuntu + Nginx + PM2)** | Full Commercial Production | ~$5–$10/mo | ~15 mins |
| **Option C: Docker Compose** | Portable Containerized VPS | ~$5–$10/mo | ~5 mins |

---

## 🌐 Option A: 100% Free Cloud Deployment (For Testing)

```
[Vercel Frontend] ──HTTPS──> [Render Backend (Node + Sockets)] ──SSL──> [Aiven MySQL]
```

### Step 1: Create a Free MySQL Cloud Database (2 mins)
1. Sign up for free at **[Aiven.io](https://aiven.io)** or **[TiDB Cloud](https://tidbcloud.com)**.
2. Create a free MySQL service (select any region near your target audience).
3. Copy your database connection string:
   ```
   mysql://avnadmin:YOUR_PASSWORD@your-db-host.aivencloud.com:port/defaultdb?ssl-mode=REQUIRED
   ```

### Step 2: Deploy Backend to Render (Free) (3 mins)
1. Push your repository to **GitHub**.
2. Go to **[Render.com](https://render.com)** ➔ Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Set the configuration:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
5. Add **Environment Variables**:
   - `DATABASE_URL`: *(Your Aiven MySQL connection string from Step 1)*
   - `JWT_SECRET`: *(A random 64-character secret string)*
   - `JWT_PHOTO_SECRET`: *(A random 64-character secret string)*
   - `FRONTEND_URL`: `*` *(or your Vercel URL)*
   - `NODE_ENV`: `production`
6. Click **Create Web Service**.
7. In the Render service dashboard, open the **Shell** tab and initialize your database tables:
   ```bash
   npx prisma db push
   ```
8. Copy your live backend URL (e.g., `https://stitchmatch-api.onrender.com`).

### Step 3: Deploy Frontend to Vercel (Free) (2 mins)
1. Go to **[Vercel.com](https://vercel.com)** ➔ Click **Add New Project**.
2. Select your GitHub repository.
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
4. Add an **Environment Variable**:
   - `VITE_API_URL`: `https://stitchmatch-api.onrender.com` *(your Render backend URL)*
5. Click **Deploy**. Your app is now live with free SSL!

---

## 🏢 Option B: Custom Domain & VPS Deployment (Ubuntu + Nginx + PM2)

Recommended for hosting on your own Linux server (DigitalOcean, Linode, AWS EC2, Hetzner, etc.) with your custom domain.

### 1. Server Prerequisites
On a fresh Ubuntu 22.04 / 24.04 server:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20, Nginx, MySQL, and Certbot
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx mysql-server git

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Configure MySQL Database
```bash
sudo mysql
```
Inside MySQL:
```sql
CREATE DATABASE stitchmatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stitchmatch_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON stitchmatch.* TO 'stitchmatch_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Clone and Setup StitchMatch
```bash
cd /var/www
sudo git clone https://github.com/Dave1118m/stitchmatch.git
sudo chown -R $USER:$USER /var/www/stitchmatch
cd /var/www/stitchmatch

# Setup Backend
cd backend
cp .env.example .env
nano .env # Paste your DATABASE_URL, JWT_SECRET, and custom domain
npm install
npx prisma generate
npx prisma db push
npm run build

# Setup Frontend
cd ../frontend
npm install
npm run build
```

### 4. Start the Backend with PM2
```bash
cd /var/www/stitchmatch
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. Configure Nginx Reverse Proxy
```bash
sudo cp /var/www/stitchmatch/nginx.conf /etc/nginx/sites-available/stitchmatch
sudo ln -s /etc/nginx/sites-available/stitchmatch /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Connect Domain DNS & Obtain Free SSL Certificate
1. In your domain registrar (GoDaddy, Namecheap, Cloudflare, Google Domains):
   - **Type A**: `@` ➔ Point to your **Server Public IP**
   - **Type A** or **CNAME**: `www` ➔ Point to your **Server Public IP**
2. Run Certbot on your server:
```bash
sudo certbot --nginx -d yourtailordomain.com -d www.yourtailordomain.com
```
*Certbot will automatically install the SSL certificates and configure auto-renewal!*

---

## 🐳 Option C: One-Command Docker Deployment

If you prefer running everything in Docker:

1. Copy `.env.example` in `backend/.env` and update your secrets.
2. Run:
```bash
docker compose up -d --build
```
3. To apply database migrations inside Docker:
```bash
docker compose exec backend npx prisma db push
```

---

## 🔑 Generating Secure Secrets in 1 Second

Whenever you need strong cryptographic secrets for `.env`:
```bash
# Generate 64-character JWT secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🩺 Verifying Deployment & Health Checks

Once deployed, you can verify your service status:
- **API Health Check**: `GET https://yourtailordomain.com/api/health` ➔ Returns `{"status":"ok"}`
- **WebSockets / Chat**: Open the Messages tab; you should see a live connection indicator without polling errors.
- **AI Camera / Video Fitting**: Ensure your browser shows the HTTPS green padlock so camera/microphone permissions are granted.
