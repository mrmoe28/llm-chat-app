# LLM Chat App

A full-stack chat application that connects to your local LM Studio server with user authentication and chat history storage.

## Features

- User authentication (login/register)
- Real-time chat with LLM
- Chat history storage in Vercel Postgres
- Multiple chat sessions
- Session management (create, view, delete)
- Responsive UI with Tailwind CSS

## Prerequisites

1. **LM Studio Server** running on your Windows PC
2. **Ngrok or Cloudflare Tunnel** to expose your LM Studio server
3. **Vercel Account** for deployment
4. **Node.js 18+** installed

## Setup Instructions

### 1. Expose Your LM Studio Server

#### Option A: Using Ngrok

Install ngrok:
```bash
# Download from https://ngrok.com/download
# Or use chocolatey
choco install ngrok
```

Start ngrok:
```bash
ngrok http 1234
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

#### Option B: Using Cloudflare Tunnel

Install cloudflared:
```bash
# Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

Start tunnel:
```bash
cloudflared tunnel --url http://localhost:1234
```

Copy the HTTPS URL provided.

### 2. Install Dependencies

```bash
cd llm-chat-app
npm install
```

### 3. Set Up Environment Variables

Create `.env.local`:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:
```
LM_STUDIO_API_URL=https://your-ngrok-url.ngrok.io/v1
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 5. Deploy to Vercel

#### A. Install Vercel CLI

```bash
npm install -g vercel
```

#### B. Login to Vercel

```bash
vercel login
```

#### C. Set Up Vercel Postgres

1. Go to your Vercel dashboard
2. Create a new project or select existing one
3. Go to Storage → Create Database → Postgres
4. Copy the environment variables

#### D. Deploy

```bash
vercel
```

Follow the prompts.

#### E. Set Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add all variables from `.env.local.example`:
   - `LM_STUDIO_API_URL` - Your ngrok/cloudflare URL
   - `NEXTAUTH_SECRET` - Generated secret
   - Database variables (auto-populated if using Vercel Postgres)

#### F. Initialize Database

After deployment, visit:
```
https://your-app.vercel.app/api/init-db
```

This creates the database tables.

### 6. Create Your First User

Visit your deployed app and register with your email and password.

## Usage

1. **Start LM Studio** on your Windows PC
2. **Load a model**: `lms load microsoft/phi-4-mini-reasoning`
3. **Start ngrok/tunnel**: `ngrok http 1234`
4. **Access your app** from anywhere via the Vercel URL
5. **Login** and start chatting

## Important Notes

### Security

- Keep your LM Studio server URL private
- Use strong passwords
- Ngrok free tier URLs change on restart (update env var each time)
- Consider using Cloudflare Tunnel for persistent URLs

### Ngrok Limitations

- Free tier URLs expire when ngrok restarts
- You'll need to update `LM_STUDIO_API_URL` in Vercel each time
- Upgrade to ngrok paid plan for permanent URLs

### Database

- Vercel Postgres free tier: 256MB storage
- Stores: users, chat sessions, messages
- Auto-managed by Vercel

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Chat
- `POST /api/chat` - Send message and get response
- `GET /api/messages?sessionId={id}` - Get session messages
- `GET /api/sessions?userId={id}` - Get user sessions
- `DELETE /api/sessions` - Delete session

### Database
- `GET /api/init-db` - Initialize database (run once)

## Troubleshooting

### "Cannot connect to LM Studio"

1. Check LM Studio is running: `lms status`
2. Verify ngrok/tunnel is active
3. Test ngrok URL: `curl https://your-url.ngrok.io/v1/models`
4. Update `LM_STUDIO_API_URL` in Vercel env vars

### "Database error"

1. Ensure you ran `/api/init-db`
2. Check Vercel Postgres is connected
3. Verify database env vars are set

### "Model not loaded"

1. On Windows PC: `lms load microsoft/phi-4-mini-reasoning`
2. Verify: `lms status`

## Architecture

```
User Browser
    ↓
Vercel (Next.js App + Postgres)
    ↓
Ngrok/Cloudflare Tunnel
    ↓
Windows PC (LM Studio Server)
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Vercel Postgres
- **Auth**: Custom JWT-less auth with bcrypt
- **LLM**: LM Studio (local server)
- **Deployment**: Vercel

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
