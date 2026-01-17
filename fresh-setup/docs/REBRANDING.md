# Rebranding Guide

How to customize this template for your own World ID social app.

---

## Quick Rebrand (Automated)

### Step 1: Edit Configuration

Open `brand.config.json` and update the values:

```json
{
  "app": {
    "name": "YourAppName",
    "name_lowercase": "yourappname",
    "tagline": "Your catchy tagline here",
    "description": "Description of your app"
  },
  "session": {
    "storage_key": "yourapp_user"
  },
  "storage": {
    "avatars_bucket": "avatars",
    "photos_bucket": "photos"
  },
  "payments": {
    "currency": "WLD",
    "premium_unlock_amount": "1.0",
    "tip_amount": "0.5",
    "boost_amount": "5.0",
    "invisible_mode_amount": "5.0",
    "creator_share_percent": "80",
    "platform_share_percent": "20"
  },
  "urls": {
    "github_repo": "https://github.com/yourusername/yourappname",
    "production_domain": "yourappname.vercel.app"
  },
  "supabase": {
    "project_name_dev": "yourappname-dev",
    "project_name_staging": "yourappname-staging",
    "project_name_prod": "yourappname-prod"
  }
}
```

### Step 2: Run Rebrand Script

```bash
# Make sure jq is installed
brew install jq  # macOS
# or: apt install jq  # Linux

# Run the rebrand script
cd fresh-setup
./rebrand.sh
```

The script will replace all `__PLACEHOLDER__` values with your configuration.

### Step 3: Verify Changes

Review the updated files:
- `database/*.sql` - Check bucket names and comments
- `env-templates/*` - Check app references
- `docs/*.md` - Check all documentation

---

## Manual Rebrand

If you prefer manual control, search and replace these placeholders:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `Ojo` | Display name | `Ojo` |
| `ojo` | Lowercase name | `ojo` |
| `Keep an eye on what is real` | Short tagline | `Keep an eye on what is real` |
| `Social network for verified humans using World ID` | Full description | `Social network for verified humans` |
| `ojo_user` | localStorage key | `ojo_user` |
| `avatars` | Avatar storage bucket | `avatars` |
| `photos` | Photos storage bucket | `photos` |
| `WLD` | Payment currency | `WLD` |
| `https://github.com/your-username/__APP_NAME_LOWER__` | GitHub repository URL | `https://github.com/user/repo` |
| `__APP_NAME_LOWER__.vercel.app` | Production domain | `ojo.vercel.app` |
| `__APP_NAME_LOWER__-dev` | Dev Supabase project | `ojo-dev` |
| `__APP_NAME_LOWER__-staging` | Staging Supabase project | `ojo-staging` |
| `__APP_NAME_LOWER__-prod` | Prod Supabase project | `ojo-prod` |

### Using sed (macOS/Linux)

```bash
# Example: Replace app name
find fresh-setup -type f \( -name "*.sql" -o -name "*.md" -o -name ".env*" \) \
  -exec sed -i '' 's/Ojo/MyApp/g' {} \;

# Replace all placeholders
sed -i '' 's/Ojo/MyApp/g' fresh-setup/**/*
sed -i '' 's/ojo/myapp/g' fresh-setup/**/*
# ... continue for each placeholder
```

### Using VS Code

1. Open the `fresh-setup` folder
2. Press `Cmd+Shift+H` (Find and Replace in Files)
3. Search: `Ojo`
4. Replace: `YourAppName`
5. Click "Replace All"
6. Repeat for each placeholder

---

## Configuration Reference

### App Settings

```json
"app": {
  "name": "Ojo",              // Display name (Title Case)
  "name_lowercase": "ojo",    // URL-safe name (lowercase)
  "tagline": "...",           // Marketing tagline
  "description": "..."        // Full description
}
```

### Session Settings

```json
"session": {
  "storage_key": "ojo_user"   // localStorage key for user session
}
```

**Important:** If changing the session key, also update:
- `src/lib/session.ts`
- Any other files that reference the session key

### Storage Settings

```json
"storage": {
  "avatars_bucket": "avatars",  // Bucket for profile pictures
  "photos_bucket": "photos"     // Bucket for post images
}
```

**Important:** Bucket names must:
- Be lowercase
- No spaces or special characters
- Match what you create in Supabase Dashboard

### Payment Settings

```json
"payments": {
  "currency": "WLD",                    // Payment currency
  "premium_unlock_amount": "1.0",       // Cost to unlock premium posts
  "tip_amount": "0.5",                  // Default tip amount
  "boost_amount": "5.0",                // Cost to boost a post
  "invisible_mode_amount": "5.0",       // Cost for 30-day invisible mode
  "creator_share_percent": "80",        // % of payments to creators
  "platform_share_percent": "20"        // % of payments to platform
}
```

### URL Settings

```json
"urls": {
  "github_repo": "https://github.com/user/repo",
  "production_domain": "yourapp.vercel.app"
}
```

### Supabase Settings

```json
"supabase": {
  "project_name_dev": "yourapp-dev",
  "project_name_staging": "yourapp-staging",
  "project_name_prod": "yourapp-prod"
}
```

---

## What Else to Rebrand

After running the rebrand script, you'll also want to update:

### 1. Source Code

Files that reference the app name or session:

```
src/lib/session.ts         # Session storage key
src/app/layout.tsx         # Page title, metadata
src/app/page.tsx           # Landing page content
src/components/Header.tsx  # Logo/branding
public/                    # Logo images, favicons
```

### 2. Configuration Files

```
package.json               # "name" field
next.config.js             # Any hardcoded values
vercel.json               # Project settings (if exists)
```

### 3. Assets

```
public/logo.png           # App logo
public/favicon.ico        # Browser favicon
public/og-image.png       # Social sharing image
```

### 4. Documentation

```
README.md                 # Project README
CLAUDE.md                 # AI assistant context
```

---

## Example: Full Rebrand

Let's rebrand from "Ojo" to "Vibe":

### 1. Update brand.config.json

```json
{
  "app": {
    "name": "Vibe",
    "name_lowercase": "vibe",
    "tagline": "Feel the real connection",
    "description": "Authentic social network for verified humans"
  },
  "session": {
    "storage_key": "vibe_user"
  },
  "storage": {
    "avatars_bucket": "avatars",
    "photos_bucket": "photos"
  },
  "payments": {
    "currency": "WLD"
  },
  "urls": {
    "github_repo": "https://github.com/myname/vibe",
    "production_domain": "vibe-app.vercel.app"
  },
  "supabase": {
    "project_name_dev": "vibe-dev",
    "project_name_staging": "vibe-staging",
    "project_name_prod": "vibe-prod"
  }
}
```

### 2. Run rebrand script

```bash
./rebrand.sh
```

### 3. Update source code

```bash
# Update session key in code
sed -i '' 's/ojo_user/vibe_user/g' src/lib/session.ts

# Update page titles
sed -i '' 's/Ojo/Vibe/g' src/app/layout.tsx

# Update package.json
sed -i '' 's/"name": "ojo"/"name": "vibe"/g' package.json
```

### 4. Update assets

- Replace `public/logo.png` with Vibe logo
- Update `public/favicon.ico`
- Create new `public/og-image.png`

### 5. Test

```bash
npm run build
npm run dev
```

---

## Checklist

After rebranding, verify:

- [ ] All `__PLACEHOLDER__` values are replaced
- [ ] Session key matches in config and code
- [ ] Bucket names match Supabase setup
- [ ] Logo and favicon updated
- [ ] Page titles and metadata updated
- [ ] README.md updated
- [ ] Build passes (`npm run build`)
- [ ] App works locally (`npm run dev`)
