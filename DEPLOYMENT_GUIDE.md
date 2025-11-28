# Complete Deployment Guide

## Step-by-Step Deployment to Vercel

### Part 1: Prepare Your LM Studio Server

#### 1.1 Ensure LM Studio is Running

On your Windows PC:
```bash
lms status
```

Should show: `Server: ON (port: 1234)`

#### 1.2 Load a Model

```bash
lms load microsoft/phi-4-mini-reasoning
```

Verify:
```bash
lms status
```

### Part 2: Expose Your Server to the Internet

#### Option A: Ngrok (Recommended for Quick Testing)

**Install Ngrok:**
1. Download from https://ngrok.com/download
2. Unzip to a folder
3. Add to PATH or use full path

**Run Ngrok:**
```bash
ngrok http 1234
```

**Copy the URL:**
Look for the line that says:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:1234
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

**Important:** Free ngrok URLs change every time you restart ngrok!

#### Option B: Cloudflare Tunnel (Recommended for Permanent URL)

**Install Cloudflared:**
1. Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Install the executable

**Run Tunnel:**
```bash
cloudflared tunnel --url http://localhost:1234
```

**Copy the URL** shown in the output.

**For Permanent URL:**
1. Create Cloudflare account
2. Follow: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/
3. Set up named tunnel

### Part 3: Test Your Tunnel

Test from any computer (or your Mac):
```bash
curl https://your-tunnel-url/v1/models
```

Should return JSON with your models.

### Part 4: Prepare the App

#### 4.1 Install Dependencies

```bash
cd C:\Users\ekoso\Desktop\minipcserver\llm-chat-app
npm install
```

#### 4.2 Create Environment File

Create `.env.local`:
```env
LM_STUDIO_API_URL=https://your-tunnel-url/v1
NEXTAUTH_SECRET=use-openssl-rand-base64-32-to-generate
NEXTAUTH_URL=http://localhost:3000
```

To generate NEXTAUTH_SECRET (Git Bash on Windows):
```bash
openssl rand -base64 32
```

### Part 5: Test Locally

```bash
npm run dev
```

Visit: http://localhost:3000

1. Register a new account
2. Try sending a message
3. Verify you get a response

If it works locally, you're ready to deploy!

### Part 6: Deploy to Vercel

#### 6.1 Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub (recommended)

#### 6.2 Install Vercel CLI

```bash
npm install -g vercel
```

#### 6.3 Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

#### 6.4 Initialize Git (if not already)

```bash
cd C:\Users\ekoso\Desktop\minipcserver\llm-chat-app
git init
git add .
git commit -m "Initial commit"
```

#### 6.5 Deploy

```bash
vercel
```

Answer the prompts:
- Set up and deploy? **Y**
- Which scope? **Select your account**
- Link to existing project? **N**
- Project name? **llm-chat-app** (or your choice)
- Directory? **./** (press Enter)
- Override settings? **N**

Wait for deployment to complete.

### Part 7: Set Up Vercel Postgres

#### 7.1 Create Database

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Choose a region close to you
7. Click **Create**

#### 7.2 Connect Database

1. In the database page, click **Connect**
2. Select your project
3. Click **Connect**

This automatically adds database environment variables to your project.

### Part 8: Add Environment Variables

#### 8.1 Go to Project Settings

1. In Vercel dashboard, go to your project
2. Go to **Settings** → **Environment Variables**

#### 8.2 Add Variables

Add these environment variables:

**LM_STUDIO_API_URL**
- Value: `https://your-tunnel-url/v1`
- Environments: Production, Preview, Development

**NEXTAUTH_SECRET**
- Value: (the secret you generated)
- Environments: Production, Preview, Development

**NEXTAUTH_URL**
- Value: `https://your-app.vercel.app`
- Environments: Production

#### 8.3 Redeploy

After adding env vars:
```bash
vercel --prod
```

### Part 9: Initialize Database

Visit this URL in your browser:
```
https://your-app.vercel.app/api/init-db
```

You should see:
```json
{"message":"Database initialized successfully"}
```

### Part 10: Test Your Deployment

1. Visit: `https://your-app.vercel.app`
2. Register a new account
3. Send a message
4. Verify you get a response from your LLM

## Maintenance

### Updating LM Studio URL

If using ngrok (free tier), the URL changes on restart:

1. Start ngrok: `ngrok http 1234`
2. Copy new URL
3. Go to Vercel dashboard
4. Settings → Environment Variables
5. Edit `LM_STUDIO_API_URL`
6. Update to new ngrok URL
7. Redeploy: `vercel --prod`

### Keeping Everything Running

**On your Windows PC:**
1. Keep LM Studio server running
2. Keep ngrok/cloudflare tunnel running
3. Keep a model loaded

**To run in background:**

Create `start-all.bat`:
```batch
@echo off
start /b lms server start
timeout /t 5
start /b lms load microsoft/phi-4-mini-reasoning
timeout /t 10
start /b ngrok http 1234
echo All services started!
pause
```

## Troubleshooting

### Issue: Can't connect to LM Studio

**Check:**
1. LM Studio running: `lms status`
2. Ngrok/tunnel active
3. Test tunnel: `curl https://your-url/v1/models`
4. Correct URL in Vercel env vars

### Issue: Database errors

**Fix:**
1. Visit `/api/init-db`
2. Check Vercel Postgres is connected
3. Verify database env vars exist

### Issue: "No model loaded"

**Fix:**
On Windows PC:
```bash
lms load microsoft/phi-4-mini-reasoning
lms status
```

### Issue: Slow responses

**Solutions:**
- Use smaller model (phi-4-mini-reasoning instead of phi-4-reasoning-plus)
- Check internet connection
- Verify PC isn't under heavy load

## Security Recommendations

1. **Strong Passwords**: Use strong passwords for your account
2. **Private URL**: Don't share your ngrok/tunnel URL publicly
3. **Rate Limiting**: Consider adding rate limiting for production use
4. **HTTPS Only**: Always use HTTPS tunnels, never HTTP
5. **Monitor Usage**: Check Vercel analytics regularly

## Cost Breakdown

- **Vercel Hosting**: Free tier (hobby plan)
- **Vercel Postgres**: Free tier (256MB, good for personal use)
- **Ngrok**: Free tier (limited URLs, or $8/mo for permanent URLs)
- **Cloudflare Tunnel**: Free
- **LM Studio**: Free

**Total Cost**: $0 - $8/month depending on tunnel choice

## Next Steps

1. Customize the UI to your preferences
2. Add more features (file uploads, code syntax highlighting, etc.)
3. Set up monitoring and logging
4. Add rate limiting for security
5. Consider upgrading to permanent tunnel URL

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Vercel deployment logs
3. Check browser console for errors
4. Verify all environment variables are set correctly
