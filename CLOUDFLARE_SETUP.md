# Cloudflare Worker Deployment Guide

Your Cloudflare Worker is ready to deploy! Follow these steps:

## Step 1: Install Wrangler (Cloudflare CLI)

Open your terminal and run:

```bash
npm install -g @cloudflare/wrangler
```

## Step 2: Authenticate with Cloudflare

Run:

```bash
wrangler login
```

This will open your browser. Log in with your Cloudflare account and authorize Wrangler.

## Step 3: Create wrangler.toml Configuration File

Create a file named `wrangler.toml` in your project root with this content:

```toml
name = "loreal-routine"
main = "worker.js"
compatibility_date = "2024-12-19"

[[env.production]]
routes = [
  { pattern = "loreal.calverta2.workers.dev/*", zone_id = "your-zone-id" }
]

[env.production.vars]
# Variables can be added here if needed

[[env.production.kv_namespaces]]
# KV storage if needed in the future
```

## Step 4: Set Your OpenAI API Key as a Secret

Run this command to add your OpenAI API key as a secure Worker Secret:

```bash
wrangler secret put OPENAI_API_KEY --env production
```

When prompted, paste your OpenAI API key. It will be securely stored and never exposed in your code.

## Step 5: Deploy the Worker

Run:

```bash
wrangler deploy --env production
```

The output will show your Worker URL. It should be: `https://loreal.calverta2.workers.dev/`

## Step 6: Test It Works

Your frontend in `script.js` already has the correct Worker URL configured. You can now:

1. Open `index.html` in your browser
2. Select a product category
3. Click "Generate Routine"
4. Your request will be sent to the Worker, which will call OpenAI and return the result

## Troubleshooting

**"OPENAI_API_KEY is not defined"**: Make sure you ran the `wrangler secret put` command.

**CORS errors**: The Worker has `Access-Control-Allow-Origin: *` configured to allow requests from your frontend.

**Authentication failed in wrangler login**: Make sure you have Node.js installed and your Cloudflare account is active.

## Important Security Notes

✅ Your OpenAI API key is stored as a Worker Secret (secure)
✅ The key is never exposed in your frontend code
✅ The Worker file (`worker.js`) doesn't contain any hardcoded credentials
✅ Only students and instructors with Cloudflare access can deploy updates

Never share your OpenAI API key with anyone!
