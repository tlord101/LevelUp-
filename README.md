## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Create a `.env.local` from `.env.example` and set your keys:

   - `VITE_FIREBASE_VAPID_KEY`: your Firebase Web Push VAPID key (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)
   - `GEMINI_API_KEY`: your Gemini API key

   Example:

   ```bash
   cp .env.example .env.local
   # edit .env.local and set VITE_FIREBASE_VAPID_KEY
   ```
4. Ensure the service worker file `public/firebase-messaging-sw.js` is present so it's served at your site's root. Vite copies `public/` files to the build root automatically.
5. Run the app:
   `npm run dev`
4. Run the app:
   `npm run dev`
