# Music Quiz Game - Setup Instructions

## Prerequisites

- Node.js 18+ installed
- Spotify account (free or premium)
- Git (to clone the repository)

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Spotify API

### Create Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name:** Music Quiz Game (or any name you prefer)
   - **App description:** A multiplayer music quiz game
   - **Redirect URI:** `http://127.0.0.1:3000/api/auth/callback/spotify` ⚠️ Use 127.0.0.1, NOT localhost
   - **Website:** `http://127.0.0.1:3000`
   - Under "Which API/SDKs are you planning to use?": Check **Web API**
5. Accept the terms and click **"Save"**

**Important:** Spotify requires the explicit IP address `127.0.0.1` for local development. The hostname `localhost` is not permitted.

### Get Your Credentials

1. On your app's dashboard, click **"Settings"**
2. Copy your **Client ID**
3. Click **"View client secret"** and copy your **Client Secret**
4. Keep these values - you'll need them in the next step

## 3. Configure Environment Variables

### Generate NextAuth Secret

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output - this is your NEXTAUTH_SECRET.

### Update .env.local

Open the `.env.local` file in your project root and fill in your credentials:

```env
# Spotify API Credentials
SPOTIFY_CLIENT_ID=paste_your_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_client_secret_here

# NextAuth Configuration
NEXTAUTH_SECRET=paste_the_output_from_openssl_command_here
NEXTAUTH_URL=http://127.0.0.1:3000

# Last.fm API (optional - for future trivia features)
LASTFM_API_KEY=
```

**Example (with fake values):**
```env
SPOTIFY_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0
SPOTIFY_CLIENT_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1
NEXTAUTH_SECRET=XYZ123ABC456DEF789GHI012JKL345MNO678PQR901STU=
NEXTAUTH_URL=http://127.0.0.1:3000
```

## 4. Start the Development Server

```bash
npm run dev
```

The app should now be running at http://127.0.0.1:3000

## 5. Test the Setup

1. Open http://127.0.0.1:3000 in your browser (NOT localhost:3000)
2. Click "Login with Spotify"
3. You should be redirected to Spotify's login page
4. After logging in, you should be redirected back to the app at `/setup`

## Troubleshooting

### Error: "Configuration" on Auth Page

**Problem:** `.env.local` credentials are not set or invalid

**Solution:**
- Verify all three required environment variables are filled in `.env.local`
- Make sure there are no quotes around the values
- Restart the dev server after changing `.env.local`

### Error: "Invalid redirect_uri" or "This redirect URI is not secure"

**Problem:** Redirect URI in Spotify app settings doesn't match or uses localhost

**Solution:**
- Go back to Spotify Developer Dashboard
- Click your app → Settings
- Under "Redirect URIs", make sure you have exactly: `http://127.0.0.1:3000/api/auth/callback/spotify`
- **Important:** Must use `127.0.0.1`, NOT `localhost` (Spotify forbids localhost)
- Click "Add" if not present, then "Save"
- Make sure your `.env.local` has `AUTH_URL=http://127.0.0.1:3000`
- Access the app at `http://127.0.0.1:3000`, NOT `http://localhost:3000`

### Error: "Invalid client"

**Problem:** Client ID or Client Secret is incorrect

**Solution:**
- Double-check you copied the correct values from Spotify Dashboard
- Make sure there are no extra spaces or characters
- Regenerate Client Secret if needed (Settings → View client secret → Regenerate)

### Port 3000 Already in Use

**Problem:** Another process is using port 3000

**Solution:**
```bash
# Kill the process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

## Running Tests

### Unit Tests
```bash
npm test
```

### E2E Tests with Playwright
```bash
npm run test:e2e
```

### Build for Production
```bash
npm run build
```

## Next Steps

Once setup is complete and you can log in successfully:

1. **Test Playlist Search** - Search for a playlist and select one
2. **Test Team Setup** - Configure 2-7 teams
3. **Test Touch Zones** - See the colored zones on the game screen
4. **Test Audio** - Click "Play Audio Test" to verify audio works

See the main README.md for full feature documentation and manual testing guide.
