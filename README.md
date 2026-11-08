# Last Call Confessions

A party game for friends. Everyone answers a question in secret. A few players are picked at random, and each one chooses: **reveal your answer** or **take a shot**. A shot keeps the answer secret forever.

Live: https://lastcallconfessions.netlify.app

## How to play

1. One person creates a room and shares the 6-character code.
2. Friends join with the code and their name. Anyone can add their own questions in the lobby.
3. The host starts the game. Everyone sees the same question and locks in a hidden answer.
4. Once everyone has answered, the game picks who’s on the spot (usually one player, sometimes two or three, rarely everyone).
5. Picked players see their own answer and choose: reveal it to the room, or take a shot.
6. The host starts the next round. Players can join mid-game with the host’s approval.

Taking a shot is always optional. Drink responsibly, and only play if you’re of legal drinking age.

## Built with

- React + Vite
- Supabase (database, realtime, anonymous sign-in)
- Netlify (hosting)

## Run it locally

```bash
npm install
npm run dev
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is meant to be public, and row-level security protects the data. Never put the `service_role` key in this project.

## Supabase setup

1. Create a project and turn on **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
2. Run the SQL for the tables, policies, and functions in the SQL Editor: `rooms`, `players`, `custom_questions`, `answers`, `submissions`, `decisions`, `join_requests`.
3. Make sure these tables are in the `supabase_realtime` publication: `rooms`, `players`, `custom_questions`, `submissions`, `decisions`, `join_requests`.

Answers are hidden by row-level security: you can only read your own answer until you choose to reveal it.

Free Supabase projects pause after about a week of inactivity. Open the dashboard and press **Resume project** if the game stops loading.

## Deploy

Push to GitHub and connect the repo to Netlify. Set the build command to `npm run build` and the publish folder to `dist`, and add the two `VITE_SUPABASE_*` environment variables **before** the first deploy. Every push to the main branch redeploys the site.

## Project structure

```
src/
  components/   screens and popups (Home, Lobby, Game, Selection, Settings…)
  hooks/        useLobby, useGame, useKeepAwake
  lib/          supabase client, game actions, questions, avatars, sound, music, settings
public/
  avatars/      player characters
  sfx/          sound effects
  music/        background track
```

## Customizing

- **Questions:** edit the list in `src/lib/questions.js`.
- **Characters:** add images to `public/avatars/` and list them in `src/lib/avatars.js`.
- **Sounds:** drop files in `public/sfx/` and `public/music/`, then set their names in `src/lib/sound.js` and `src/lib/music.js`.
