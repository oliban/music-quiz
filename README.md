# Mixtape Duel

A 2-team music quiz game powered by Spotify. Teams compete by identifying songs from their Spotify playlists in a fast-paced, interactive game designed for tablets and touch devices.

**Live Demo**: [https://mixtape-duel.fly.dev](https://mixtape-duel.fly.dev)

## Features

- **Spotify Integration**: 30-second preview playback using HTML5 Audio (works with Free and Premium)
- **Multiple Question Types**:
  - 🎯 **Buzz-In**: Name that tune - first team to buzz in gets to answer
  - 🎲 **Multiple Choice**: Tap the correct answer from the options shown
- **2-Team Touch Interface**: Two teams play on a single device
- **Touch Zones**: Each team has a top or bottom zone for buzzing in and submitting answers
- **Real-time Scoring**: Live score tracking throughout the game
- **Playlist Search**: Browse and select any of your Spotify playlists
- **Team Customization**: Name your teams, assign colors, and choose buzzer sounds with preview
- **Game State Persistence**: Continue previous games or start fresh

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Authentication**: NextAuth.js with Spotify OAuth
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS
- **Audio**: HTML5 Audio (30-second previews from Spotify)
- **Testing**: Vitest + Playwright
- **Type Safety**: TypeScript

## Prerequisites

- Node.js 18+ and npm
- Spotify account (Free or Premium)
- Spotify Developer App credentials

## Setup

### 1. Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Fill in the details:
   - **App name**: Music Quiz Game (or your choice)
   - **App description**: Multiplayer music quiz game
   - **Redirect URI**: `http://127.0.0.1:3000/api/auth/callback/spotify`
   - **API**: Select Web API
4. Save your **Client ID** and **Client Secret**

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the project root:

```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# NextAuth
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=your_random_secret_string
```

Generate a random secret for `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

> **Note**: Use `127.0.0.1` instead of `localhost` - Spotify requires the exact loopback IP.

## Testing on Mobile Devices

To test on phones/tablets over your local network, you'll need HTTPS. Use ngrok:

### 1. Install ngrok

```bash
brew install ngrok
```

### 2. Sign up and configure

1. Sign up at [ngrok.com](https://dashboard.ngrok.com/signup)
2. Get your authtoken from [dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Configure ngrok:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

### 3. Start ngrok tunnel

```bash
ngrok http 3000
```

### 4. Update Spotify App

Add the ngrok HTTPS URL to your Spotify app's redirect URIs:
```
https://your-ngrok-url.ngrok-free.app/api/auth/callback/spotify
```

### 5. Update .env.local

```env
NEXTAUTH_URL=https://your-ngrok-url.ngrok-free.app
```

Now access the game from any device using the ngrok URL!

## Deployment to Fly.io

The app is configured for easy deployment to [Fly.io](https://fly.io).

### Prerequisites

- [Fly.io account](https://fly.io/app/sign-up) (free tier available)
- Fly CLI installed: `brew install flyctl`

### Deploy

1. **Authenticate with Fly.io**:
   ```bash
   fly auth login
   ```

2. **Launch the app** (first time only):
   ```bash
   fly launch --no-deploy
   ```
   This uses the existing `fly.toml` configuration.

3. **Set environment secrets**:
   ```bash
   fly secrets set SPOTIFY_CLIENT_ID="your_spotify_client_id"
   fly secrets set SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
   fly secrets set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
   fly secrets set NEXTAUTH_URL="https://your-app-name.fly.dev"
   fly secrets set NEXT_PUBLIC_LASTFM_API_KEY="your_lastfm_key"  # optional
   ```

4. **Update Spotify redirect URI**:
   Add `https://your-app-name.fly.dev/api/auth/callback/spotify` to your Spotify app's redirect URIs.

5. **Deploy**:
   ```bash
   fly deploy
   ```

6. **Open your app**:
   ```bash
   fly open
   ```

### Auto-scaling

The app is configured to:
- Auto-stop when idle (saves costs on free tier)
- Auto-start on first request
- Run with 1GB RAM and 1 shared CPU

## How to Play

### Setup Phase

1. **Login**: Authenticate with your Spotify account
2. **Select Playlist**: Search and choose a Spotify playlist for the quiz
3. **Configure Teams**: Name your 2 teams, assign colors, and choose buzzer sounds (with preview)
4. **Position Players**: One team at the top, one team at the bottom of the device

### Game Phase

1. **Audio Plays**: 30-second preview of the song
2. **Question Types**:
   - **Buzz-In**: Touch your team's zone to buzz in, then verbally answer. Host judges if correct.
   - **Multiple Choice**: Tap the correct answer from the options shown in your team's zone
3. **Scoring**: 100 points per correct answer
4. **Disqualification**: Teams that answer incorrectly on multiple choice questions can't try again
5. **Game End**: Final scores displayed with winner announcement

### Controls

- **Play Audio**: Manually restart audio if needed
- **Log Out**: Return to login screen
- **Rematch**: Play again with same teams/playlist, reset scores
- **New Game**: Return to setup for new playlist/teams

## Touch Zone Layout

```
┌──────────────────────────┐
│      Team 1 Zone         │
│   (Top - 35% height)     │
│  Buzz button + Answers   │
├──────────────────────────┤
│      Album Art &         │
│    Question Display      │
│   (Center - 30%)         │
├──────────────────────────┤
│      Team 2 Zone         │
│  (Bottom - 35% height)   │
│  Buzz button + Answers   │
└──────────────────────────┘
```

Each team has a dedicated zone (top or bottom) for buzzing in and viewing their answer options. The center displays the album art and question text. The top team's view is rotated 180° so both teams can read comfortably from opposite sides of the device.

## Development

### Run Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Project Structure

```
music-game/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (auth, Spotify)
│   ├── game/              # Game page
│   └── setup/             # Setup page
├── src/
│   ├── components/        # React components
│   │   ├── game/         # Game UI components
│   │   └── setup/        # Setup UI components
│   ├── lib/              # Utilities and API clients
│   │   ├── auth.ts       # NextAuth config
│   │   ├── spotify/      # Spotify API client
│   │   └── game/         # Game logic
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript definitions
├── e2e/                   # Playwright tests
└── __tests__/            # Vitest unit tests
```

## Troubleshooting

### No Audio Playing

- Check that your playlist contains tracks with available preview URLs
- Some tracks may not have 30-second previews available
- Check browser console for playback errors
- Try logging out and re-authenticating
- Verify browser allows audio autoplay (may need to click play button first)

### OAuth Errors

- Confirm redirect URI in Spotify app matches exactly
- Use `http://127.0.0.1:3000` not `localhost`
- Check that `NEXTAUTH_URL` in `.env.local` matches the URL you're using

### Mobile Access Issues

- Ensure phone and computer are on same WiFi network
- Use ngrok for HTTPS access
- Add ngrok URL to Spotify redirect URIs
- Update `NEXTAUTH_URL` to match ngrok URL

## License

MIT

## Credits

Built with Claude Code
