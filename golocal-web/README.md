# GoLocal

GoLocal is a Next.js travel and language-learning app. Its learning plan, curated lessons, and answer checking can use the FastAPI service in `../golocal-api`.

## Run locally

Start the learning API in one terminal:

```bash
cd ../golocal-api
./start.sh
```

Start the web app in another terminal:

```bash
npm install
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001). The web app proxies learning requests through `/api/parvoy/...` to `http://127.0.0.1:8000`; override `PARVOY_API_URL` in `.env.local` if the API is hosted elsewhere.

## Gemini features

Translation and fictional voice role-play use the Gemini API through server-only routes. Create a private `.env.local` from `.env.example`, add a Gemini API key, and restart Next.js. Never expose the key in a `NEXT_PUBLIC_` variable or commit the file. The selected model can be changed with `GEMINI_MODEL`.

The Translate microphone starts a timed turn with browser speech recognition. If that browser speech service is unavailable, GoLocal records a short clip and sends it to Gemini for transcription. The transcript is translated, read aloud, and added to a two-speaker conversation. Microphone permission and `GEMINI_API_KEY` are required for the fallback; GoLocal does not save the audio recording.

The Prof GoGo open-ended tutor still uses the OpenAI Responses API in `app/api/coach/route.ts`; add `OPENAI_API_KEY` to enable it. Its model can be changed with `OPENAI_MODEL`.

## Feature boundaries

Learning lessons, situations, and answer checks are served by the integrated FastAPI code. XP, module completion, daily goal, and streak are stored locally in the current browser. Phrase packs and notes are also kept on this device, and the service worker caches app assets and learning reads for offline use after an online visit. There is no user account or cross-device sync yet.

Explore is the swipeable destination card view with trip filters, a saved shortlist, and publisher article previews. Post drafts remain on this device; community review and voucher rewards are not connected to a backend. Editorial previews link to publishers and public Instagram search pages.

Account onboarding and OTP screens are still prototypes and do not authenticate users. Configure an identity provider and persistent user database before production accounts, shared progress, community publishing, or rewards.
