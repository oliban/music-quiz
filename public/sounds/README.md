# Quiz Buzzer Sound Effects

This directory contains sound effects for team buzzers in the quiz game.

## Current Sounds

The game includes 2 default buzzer sounds:
1. `buzzer-1.mp3` - Default buzzer sound 1
2. `buzzer-2.mp3` - Default buzzer sound 2

## Adding More Buzzer Sounds (Optional)

You can add more distinct buzzer sounds to give teams more options during setup. Each sound should be clearly distinguishable from the others.

## Where to Get Free Buzzer Sounds

### Recommended Sources (No Login Required):

1. **Mixkit** - https://mixkit.co/free-sound-effects/buzzer/
   - Free under Mixkit License
   - High quality MP3 files
   - Suggested sounds:
     - Wrong Answer Bass Buzzer
     - Basketball Buzzer
     - Ice Hockey Sports Buzzer

2. **Pixabay** - https://pixabay.com/sound-effects/search/quiz/
   - CC0 / Public Domain
   - No attribution required
   - Search for "quiz buzzer" or "game show buzzer"

3. **Orange Free Sounds** - https://orangefreesounds.com/wrong-answer-sound-effect/
   - Free for commercial use
   - Good variety of buzzer tones

4. **Freesound** - https://freesound.org/people/JapanYoshiTheGamer/packs/23944/
   - Creative Commons licensed
   - Pack of 4 quiz show buzzers
   - Requires free account to download

## How to Add Sounds:

1. **Download distinct buzzer sounds** from the sources above (as many as you want)
2. **Rename them descriptively** (e.g., `buzzer-bell.mp3`, `buzzer-horn.mp3`, `buzzer-ding.mp3`)
3. **Place them** in this `public/sounds/` directory
4. **Update** `src/components/setup/TeamSetup.tsx` to add them to the BUZZER_SOUNDS array:
   ```typescript
   const BUZZER_SOUNDS = [
     { label: 'Buzzer 1', value: '/sounds/buzzer-1.mp3' },
     { label: 'Buzzer 2', value: '/sounds/buzzer-2.mp3' },
     { label: 'Bell', value: '/sounds/buzzer-bell.mp3' },      // Add your new sounds
     { label: 'Horn', value: '/sounds/buzzer-horn.mp3' },      // like this
   ]
   ```
5. **Restart the dev server** to see the new options in the team setup

## Sound Requirements:

- Format: MP3 (recommended) or WAV
- Duration: 0.5-2 seconds ideal
- Volume: Normalized (similar loudness across all sounds)
- Each sound should be distinct so players can identify which team buzzed in

## Attribution:

If using sounds that require attribution, add the details here:
- [Sound name] by [Author] - [License] - [Source URL]
