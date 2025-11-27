# Render Database Connection Troubleshooting

If you're still experiencing database connection issues on Render after the recent fixes, follow these steps:

## 1. Check Database URL Format

The `DATABASE_URL` environment variable should use the **External Database URL**, not the internal one.

### In Render Dashboard:

1. Go to your PostgreSQL database dashboard
2. Find the **External Database URL** (not Internal)
3. Copy the full connection string
4. Go to your Web Service → Environment
5. Update `DATABASE_URL` with the external URL

### Format should be:
```
postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/dbname
```

**NOT:**
```
postgresql://user:password@dpg-xxxxx-a/dbname
```

The external URL includes the full hostname with region (e.g., `oregon-postgres.render.com`).

## 2. Verify Database is Running

1. Go to your database dashboard on Render
2. Check status is "Available" (green)
3. If suspended, click "Resume"

## 3. Check Connection Allowlist

1. In database settings, check "Allowed IP Addresses"
2. For Render services, this should be empty (allows all Render services)
3. If you added specific IPs, remove them or add your web service's IP

## 4. Test Connection Manually

From your Render Shell (Web Service → Shell):

```bash
# Test if database is reachable
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); pool.query('SELECT NOW()').then(r => console.log('Connected!', r.rows[0])).catch(e => console.error('Failed:', e.message));"
```

## 5. Recent Fixes Applied

The following improvements have been made to handle connection issues:

✅ **Increased timeout**: 5s → 30s
- Render databases can take longer to connect
- Prevents premature timeouts

✅ **Retry logic**: Up to 3 attempts with 2s delay
- Handles temporary network issues
- Better resilience during cold starts

✅ **Connection pooling**: Max 20 connections
- Better resource management
- Handles concurrent requests

✅ **Connection test**: SELECT NOW() on startup
- Verifies connection before accepting requests
- Provides clear success/failure logs

## 6. Common Issues

### Issue: "Connection terminated unexpectedly"
**Solution:** Use external database URL (see #1 above)

### Issue: "timeout of 5000ms exceeded"
**Solution:** Already fixed - timeout increased to 30s

### Issue: "SSL connection required"
**Solution:** Already configured - SSL with rejectUnauthorized: false

### Issue: Database sleeping (free tier)
**Solution:** 
- Free tier databases sleep after inactivity
- First request after sleep will be slow
- Consider upgrading to paid tier for production

## 7. Environment Variables Checklist

Ensure these are set in Render Web Service:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://... (external URL)
JWT_SECRET=your-secret-key
PORT=3000 (Render sets this automatically)
GOOGLE_CLIENT_ID=your-client-id (optional)
```

## 8. Logs to Check

In Render Web Service → Logs, look for:

### Good Signs ✅
```
Database config: { user: 'xxx', host: 'dpg-xxx.oregon-postgres.render.com', ... }
✅ Database connection successful at 2025-11-05T...
Initializing database...
Server running on port 3000
```

### Bad Signs ❌
```
❌ Failed to initialize database: Error: Connection terminated
Connection terminated due to connection timeout
ECONNREFUSED
getaddrinfo ENOTFOUND
```

## 9. Still Having Issues?

1. **Check Render Status Page**: https://status.render.com
2. **Review Database Logs**: Database → Logs tab
3. **Contact Render Support**: Help button in dashboard
4. **Check GitHub Issues**: Look for similar problems

## 10. Nuclear Option: Reconnect Database

If all else fails:

1. **Backup your data first!**
2. Go to Web Service → Environment
3. Delete `DATABASE_URL` variable
4. Go to database dashboard
5. Copy the External Database URL again
6. Add it back to Web Service environment
7. Trigger a redeploy

## Connection Flow Diagram

```
Web Service Start
    ↓
Read DATABASE_URL
    ↓
Parse connection details
    ↓
Create connection pool (30s timeout)
    ↓
Test connection (SELECT NOW)
    ↓ (retry up to 3x if fails)
    ↓
Initialize tables
    ↓
✅ Ready to accept requests
```

## Performance Tips

- **Use connection pooling** (already configured)
- **Close idle connections** (already configured: 30s idle timeout)
- **Monitor connection count**: Should stay under 20
- **Use prepared statements**: Already done in the codebase

---

**Last Updated:** November 5, 2025
**Recent Changes:** Added 30s timeout, retry logic, connection pooling
