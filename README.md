# Music Quiz Game

A multiplayer music quiz game powered by Spotify. Players compete by identifying songs from their Spotify playlists in a fast-paced, interactive game designed for tablets and touch devices.

## Features

- **Spotify Integration**: Full song playback using Spotify Web Playback SDK (requires Premium)
- **Multiple Question Types**:
  - 🎯 **Buzz-In**: Name that tune - first team to buzz in gets to answer
  - 🎲 **Drag-to-Corner**: Multiple choice - drag the correct answer to your team's corner
- **Multiplayer Touch Interface**: 2-7 teams play on a single device
- **Touch Zones**: Each team has a corner zone for buzzing in or submitting answers
- **Real-time Scoring**: Live score tracking throughout the game
- **Playlist Search**: Browse and select any of your Spotify playlists
- **Team Customization**: Name your teams and assign colors
- **Game State Persistence**: Continue previous games or start fresh

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth.js with Spotify OAuth
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS
- **Audio**: Spotify Web Playback SDK
- **Testing**: Vitest + Playwright
- **Type Safety**: TypeScript

## Prerequisites

- Node.js 18+ and npm
- Spotify Premium account (required for Web Playback SDK)
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

## How to Play

### Setup Phase

1. **Login**: Authenticate with your Spotify account
2. **Select Playlist**: Search and choose a Spotify playlist for the quiz
3. **Configure Teams**: Set number of teams (2-7) and customize names
4. **Position Players**: Each team sits around one corner of the device

### Game Phase

1. **Audio Plays**: 30 seconds of the song (full track, not preview)
2. **Question Types**:
   - **Buzz-In**: Touch your team's corner to buzz in, then verbally answer. Host judges if correct.
   - **Drag-to-Corner**: Drag the correct answer from the center to your team's corner
3. **Scoring**: 100 points per correct answer
4. **Disqualification**: Teams that answer incorrectly on drag-to-corner questions can't try again
5. **Game End**: Final scores displayed with winner announcement

### Controls

- **Play Audio**: Manually restart audio if needed
- **Log Out**: Return to login screen
- **Rematch**: Play again with same teams/playlist, reset scores
- **New Game**: Return to setup for new playlist/teams

## Touch Zone Layout

```
┌─────────────────────┐
│  Team 1   │  Team 2 │
│           │         │
├───────────┼─────────┤
│  Answers  │         │
│  & Score  │         │
├───────────┼─────────┤
│  Team 3   │  Team 4 │
│           │         │
└─────────────────────┘
```

Each corner is a touch zone for that team. The center displays questions, answers, and scores (readable from both orientations).

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

- Ensure you have **Spotify Premium** (required for Web Playback SDK)
- Check browser console for playback errors
- Try logging out and re-authenticating
- Verify token scopes in auth configuration

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
