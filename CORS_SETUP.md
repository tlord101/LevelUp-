# Firebase Storage CORS Setup

## Quick Reference

This document provides quick instructions for setting up CORS configuration for the Firebase Storage bucket.

## The Command

```bash
gsutil cors set cors.json gs://levelup-87509.appspot.com
```

## What This Does

This command applies Cross-Origin Resource Sharing (CORS) configuration to the Firebase Storage bucket, allowing the web application to access storage resources from different origins.

## Prerequisites

1. **Google Cloud SDK** - Install from: https://cloud.google.com/sdk/docs/install
2. **Authentication** - Run: `gcloud auth login`
3. **Permissions** - Ensure your account has Storage Admin or equivalent permissions for the Firebase project

## Setup Methods

### Method 1: Automated Script (Recommended)

```bash
./setup-cors.sh
```

This script handles all checks and applies the configuration automatically.

### Method 2: Manual Command

```bash
gsutil cors set cors.json gs://levelup-87509.appspot.com
```

### Method 3: GitHub Actions

Use the workflow in `.github/workflows/deploy-cors.yml`:

1. Set up the `GCP_SA_KEY` repository secret
2. Go to Actions tab
3. Select "Deploy Firebase Storage CORS Configuration"
4. Click "Run workflow"

## Verification

Check if CORS is configured correctly:

```bash
gsutil cors get gs://levelup-87509.appspot.com
```

Expected output should match the contents of `cors.json`.

## CORS Configuration Details

The configuration in `cors.json` allows:

- **Origins**: 
  - `https://level-up-rouge.vercel.app` (production)
  - `http://localhost:3000` (local development)
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Response Headers**: Content-Type, x-goog-meta-*
- **Cache Duration**: 3600 seconds (1 hour)

## Troubleshooting

### "gsutil: command not found"
Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

### "AccessDeniedException: 403"
Ensure your account has proper permissions. You may need:
- Storage Admin role
- Or custom role with `storage.buckets.update` permission

### "No credentialed accounts"
Run `gcloud auth login` to authenticate.

## For CI/CD

To automate CORS updates in CI/CD:

1. Create a Google Cloud service account
2. Grant it Storage Admin permissions
3. Generate and download a JSON key
4. Add the key as a secret in your CI/CD platform
5. Use the GitHub Actions workflow or incorporate the command in your deployment pipeline

## Additional Resources

- [Google Cloud Storage CORS Documentation](https://cloud.google.com/storage/docs/configuring-cors)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [gsutil CORS Command Reference](https://cloud.google.com/storage/docs/gsutil/commands/cors)
