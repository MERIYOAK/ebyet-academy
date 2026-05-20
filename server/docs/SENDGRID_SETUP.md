# SendGrid Setup Guide - Get Emails to Inbox (Not Spam)

## Why SendGrid?

**SendGrid automatically handles all email authentication** (SPF, DKIM, DMARC) and has excellent inbox delivery rates. This means your emails will go to the **inbox**, not spam.

## Quick Setup (5 minutes)

### Step 1: Sign Up for SendGrid (Free)

1. Go to https://sendgrid.com
2. Click "Start for Free"
3. Create an account (Free tier: **100 emails/day** - perfect for most apps)
4. Verify your email address

### Step 2: Create API Key

1. In SendGrid Dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `Ibyet Investing API Key`
4. Select **Full Access** (or "Restricted Access" with Mail Send permissions)
5. Click **Create & View**
6. **COPY THE API KEY** (you won't see it again!)

### Step 3: Verify Sender Email/Domain

**Option A: Single Sender Verification (Easiest - for testing)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details:
   - From Email: `noreply@yourdomain.com` (or your Gmail)
   - From Name: `Ibyet Investing`
   - Reply To: `support@yourdomain.com`
4. Click **Create**
5. Check your email and click the verification link

**Option B: Domain Authentication (Best - for production)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions
4. Add the DNS records to your domain
5. Wait for verification (usually 5-10 minutes)

### Step 4: Add to Your .env File

Add this line to your `server/.env` file:

```env
# SendGrid Configuration (RECOMMENDED for inbox delivery)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Identity
FROM_EMAIL="Ibyet Investing <noreply@yourdomain.com>"
FROM_NAME="Ibyet Investing"
REPLY_TO_EMAIL=support@yourdomain.com

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com
```

**Replace:**
- `SG.xxxxxxxx...` with your actual SendGrid API key
- `noreply@yourdomain.com` with your verified sender email
- `https://yourdomain.com` with your actual frontend URL

### Step 5: Restart Your Server

```bash
# Stop your server (Ctrl+C)
# Then restart
npm run dev
```

You should see:
```
✅ Email service configured with SendGrid (best inbox delivery)
```

## Testing

1. Register a new user account
2. Check the email inbox (not spam!)
3. The email should arrive within seconds

## Troubleshooting

### "Email service not configured"
- Make sure `SENDGRID_API_KEY` is in your `.env` file
- Restart your server after adding the key

### "Sender not verified"
- Go to SendGrid Dashboard → Settings → Sender Authentication
- Make sure your sender email is verified (green checkmark)

### Still going to spam?
- Make sure you verified your sender email/domain in SendGrid
- Use a custom domain email (not @gmail.com) for best results
- Check SendGrid dashboard for any warnings

## Benefits of SendGrid

✅ **Automatic SPF/DKIM/DMARC** - No DNS configuration needed  
✅ **High inbox delivery** - 95%+ inbox rate  
✅ **Email analytics** - Track opens, clicks, bounces  
✅ **Free tier** - 100 emails/day (perfect for most apps)  
✅ **Scalable** - Easy to upgrade as you grow  

## Alternative: Keep Using SMTP

If you prefer to keep using SMTP (Gmail, etc.), the service will automatically fall back to SMTP if SendGrid is not configured. However, **SendGrid is strongly recommended** for better inbox delivery.

## Support

- SendGrid Docs: https://docs.sendgrid.com
- SendGrid Support: support@sendgrid.com



