# Deployment (Vercel)

Quick steps to ensure the frontend talks to the correct auth API after deploy.

1. Set the frontend API base URL in Vercel (Production) only if you are deploying the Express backend separately:

   - Key: `VITE_API_BASE_URL`
   - Value: your backend URL (example: `https://api.example.com`) or leave empty to use same-origin `/api` paths.
   - Do NOT include a trailing slash.
   - Production builds ignore loopback values like `http://localhost:4000`, so make sure the deployed env points to a real hosted backend.
   - If you leave this empty, the frontend uses the built-in demo auth mode backed by `localStorage`, which works on Vercel without deploying the backend.

2. Backend SMTP (if using email features):

   - In your backend environment (Vercel or hosting provider) set:
     - `MAIL_USER` (email address)
     - `MAIL_APP_PASSWORD` (app password or SMTP password)
     - Optionally `ALLOW_INSECURE_DEV_OTP=true` for development only.

3. Redeploy the frontend on Vercel after setting the env variables.

4. Verify:

   - Visit your site and confirm the auth banner is gone.
   - If `VITE_API_BASE_URL` is set, check network calls in DevTools to ensure API calls go to your backend domain (not `localhost`).
   - If `VITE_API_BASE_URL` is empty, sign up or use one of the demo accounts and confirm the app stays in browser-local auth mode.
   - (Optional) Check health: `GET https://your-site.com/api/auth/health` — should return 200/OK.

Local dev commands

```bash
# start backend (API)
npm run dev:api
# start frontend dev server
npm run dev
```

Notes

- The repository intentionally leaves `VITE_API_BASE_URL` empty in `.env` and `.env.example` so you must set it in your deployment environment.
- The `build/` directory is gitignored; Vercel builds the project during deploy using the repo and your environment variables.
