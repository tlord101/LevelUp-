<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gB2eER7WKpWKsJitemOJEDPklQJyS0Tq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Firebase Storage CORS Configuration

This app uses Firebase Storage and requires CORS (Cross-Origin Resource Sharing) configuration to allow the web app to access storage resources.

### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
- Authenticated with Google Cloud: `gcloud auth login`
- Proper permissions for the Firebase project

### Setup CORS

#### Option 1: Using the Setup Script (Recommended)

Run the automated setup script:

```bash
./setup-cors.sh
```

This script will:
- Check for required dependencies
- Verify authentication
- Apply the CORS configuration from `cors.json` to the Firebase Storage bucket

#### Option 2: Manual Setup

Run the following command directly:

```bash
gsutil cors set cors.json gs://levelup-87509.appspot.com
```

#### Verify CORS Configuration

To verify the CORS configuration was applied correctly:

```bash
gsutil cors get gs://levelup-87509.appspot.com
```

### CORS Configuration Details

The `cors.json` file configures the following:
- **Allowed Origins**: 
  - `https://level-up-rouge.vercel.app` (production)
  - `http://localhost:3000` (local development)
- **Allowed Methods**: GET, POST, PUT, DELETE
- **Response Headers**: Content-Type, x-goog-meta-*
- **Max Age**: 3600 seconds
