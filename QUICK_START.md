# Quick Start Guide

Get your LLM chat app running in 5 minutes!

## Prerequisites

- LM Studio running with a model loaded
- Node.js 18+ installed
- Ngrok or Cloudflare Tunnel

## Quick Setup

### 1. Install Dependencies (2 minutes)

```bash
cd C:\Users\ekoso\Desktop\minipcserver\llm-chat-app
npm install
```

### 2. Expose Your LM Studio Server (1 minute)

In a new terminal:
```bash
ngrok http 1234
```

Copy the HTTPS URL shown (e.g., `https://abc123.ngrok-free.app`)

### 3. Configure Environment (1 minute)

Create `.env.local`:
```bash
LM_STUDIO_API_URL=https://your-ngrok-url/v1
NEXTAUTH_SECRET=any-long-random-string-here-at-least-32-characters
NEXTAUTH_URL=http://localhost:3000
```

Replace `your-ngrok-url` with the URL from step 2.

### 4. Start the App (1 minute)

```bash
npm run dev
```

### 5. Use the App!

1. Open http://localhost:3000
2. Click "Register" and create an account
3. Start chatting with your LLM!

## Deploy to Vercel (Optional - 10 minutes)

See **DEPLOYMENT_GUIDE.md** for full instructions.

Quick version:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts, then:
# 1. Add Vercel Postgres in dashboard
# 2. Set environment variables
# 3. Visit /api/init-db to set up database
```

## Troubleshooting

**Can't connect to LM Studio?**
- Check ngrok is running
- Verify LM Studio has a model loaded: `lms status`
- Test ngrok URL: `curl https://your-url/v1/models`

**App crashes?**
- Check all environment variables are set in `.env.local`
- Ensure ngrok URL includes `/v1` at the end

**No response from LLM?**
- Load a model: `lms load microsoft/phi-4-mini-reasoning`
- Check Windows PC isn't asleep

## What's Next?

- Deploy to Vercel for access from anywhere
- Use Cloudflare Tunnel for permanent URL
- Customize the UI
- Add more features

Happy chatting! 🚀
