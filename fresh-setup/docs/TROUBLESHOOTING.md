# Ojo Troubleshooting Guide

Common issues and their solutions.

---

## Table of Contents

1. [Database Issues](#database-issues)
2. [Storage Issues](#storage-issues)
3. [Authentication Issues](#authentication-issues)
4. [Deployment Issues](#deployment-issues)
5. [Runtime Errors](#runtime-errors)

---

## Database Issues

### "relation does not exist"

**Symptom:** Error mentioning a table doesn't exist

**Cause:** Schema not applied or partially applied

**Solution:**
1. Go to Supabase SQL Editor
2. Run `database/01-schema.sql` again
3. Check for errors in output
4. Verify tables in Table Editor

### "permission denied for table"

**Symptom:** Can't read/write to tables

**Cause:** RLS policies not applied

**Solution:**
1. Run `database/02-policies.sql`
2. Verify RLS is enabled on all tables
3. Check policies in Authentication → Policies

### "violates foreign key constraint"

**Symptom:** Can't insert/delete records

**Cause:** Related data exists or doesn't exist

**Solution:**
- For inserts: Ensure referenced record exists (e.g., user before post)
- For deletes: Data should cascade automatically with `ON DELETE CASCADE`
- Check `01-schema.sql` has CASCADE on all foreign keys

### Realtime not working

**Symptom:** Chat messages don't update in real-time

**Cause:** Realtime not enabled for tables

**Solution:**
1. Go to Database → Replication
2. Enable `messages` and `connections` tables
3. Or run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
```

---

## Storage Issues

### "Failed to upload image"

**Symptom:** Avatar or post image upload fails

**Causes & Solutions:**

1. **Bucket doesn't exist**
   - Go to Storage
   - Create buckets: `avatars` and `photos`
   - Make them Public

2. **Bucket not public**
   - Click bucket → Settings
   - Enable "Public bucket"

3. **Policies not applied**
   - Run `database/03-storage.sql`
   - Verify 4 policies per bucket

4. **File too large**
   - Default limit: 50MB
   - Adjust in bucket settings if needed

### "Object not found"

**Symptom:** Images not loading after upload

**Cause:** URL construction issue or bucket misconfiguration

**Solution:**
1. Check bucket is set to Public
2. Verify the file exists in Storage browser
3. Check URL format matches: `{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}`

### Storage quota exceeded

**Symptom:** Can't upload new files

**Solution:**
1. Go to Storage → each bucket
2. Delete old/unused files
3. Consider upgrading Supabase plan

---

## Authentication Issues

### "Verification failed"

**Symptom:** World ID verification doesn't complete

**Causes & Solutions:**

1. **Wrong App ID**
   - Check `NEXT_PUBLIC_APP_ID` matches Developer Portal
   - Format: `app_xxxxxxxxxxxxx`

2. **Verification level mismatch**
   - Ojo requires Orb verification
   - Device verification won't work

3. **Action not configured**
   - Verify action exists in Developer Portal
   - Check action name matches code

### "Session not found"

**Symptom:** User appears logged out unexpectedly

**Cause:** localStorage cleared or corrupted

**Solution:**
1. User can re-verify with World ID
2. Check code uses `ojo_user` as session key
3. Verify session.ts handles null cases

### Admin panel not accessible

**Symptom:** /admin returns 404 or access denied

**Solution:**
1. Get your nullifier_hash from localStorage
2. Set `NEXT_PUBLIC_ADMIN_ID` to this value
3. Redeploy (Vercel) or restart dev server

---

## Deployment Issues

### Build fails on Vercel

**Symptom:** Deployment fails during build

**Common Causes:**

1. **Missing environment variables**
   ```
   Error: NEXT_PUBLIC_SUPABASE_URL is not defined
   ```
   - Add all env vars in Vercel Project Settings

2. **TypeScript errors**
   ```
   Type error: ...
   ```
   - Run `npm run build` locally first
   - Fix any TypeScript errors

3. **Dependency issues**
   ```
   Module not found: ...
   ```
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again
   - Push updated `package-lock.json`

### Environment variables not working

**Symptom:** App uses wrong/empty env values

**Solution:**
1. Verify vars are set in Vercel dashboard
2. Check they're set for correct environment (Production/Preview)
3. Ensure variable names start with `NEXT_PUBLIC_`
4. Redeploy after changing variables

### Domain not working

**Symptom:** Custom domain returns error

**Solution:**
1. Verify DNS records are correct
2. Wait for DNS propagation (up to 48 hours)
3. Check SSL certificate status in Vercel

---

## Runtime Errors

### "Network request failed"

**Symptom:** API calls fail silently

**Causes & Solutions:**

1. **Wrong Supabase URL**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` format
   - Should be: `https://xxxxx.supabase.co`

2. **Invalid anon key**
   - Copy fresh key from Supabase → Settings → API

3. **CORS issues**
   - Check browser console for CORS errors
   - Verify Supabase project settings

### "Cannot read property of undefined"

**Symptom:** App crashes with null/undefined error

**Common Causes:**
- User session expired
- Data not loaded yet
- Missing null checks

**Solution:**
1. Check browser console for full stack trace
2. Add optional chaining: `user?.name`
3. Add loading states for async data

### Payments not working

**Symptom:** WLD payments fail or don't arrive

**Solution:**
1. Verify wallet address is correct
2. Check user has sufficient WLD balance
3. Verify MiniKit is properly initialized
4. Test in World App (not browser)

---

## Debug Commands

### Check session in browser
```javascript
// In browser console
localStorage.getItem('ojo_user')
```

### Check Supabase connection
```javascript
// In browser console
const { data, error } = await supabase.from('users').select('count')
console.log(data, error)
```

### View all localStorage
```javascript
// In browser console
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  console.log(key, localStorage.getItem(key))
}
```

### Clear session (logout)
```javascript
// In browser console
localStorage.removeItem('ojo_user')
location.reload()
```

---

## Getting Help

### Before asking for help:

1. Check browser console for errors
2. Check Supabase logs (Database → Logs)
3. Check Vercel deployment logs
4. Search existing GitHub issues
5. Read through this troubleshooting guide

### When reporting issues, include:

- Browser and version
- Device type (mobile/desktop)
- Full error message
- Steps to reproduce
- Screenshots if applicable
