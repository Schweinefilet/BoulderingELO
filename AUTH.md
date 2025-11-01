# Authentication Setup

## Setting the Password on Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your service: `bouldering-elo-api`
3. Go to **Environment** tab
4. Find the `APP_PASSWORD` variable
5. Set it to your desired password (e.g., `mySecurePassword123`)
6. Click **Save Changes**
7. The service will automatically redeploy

## Using the App

1. Visit https://schweinefilet.github.io/BoulderingELO/
2. You'll see a login screen
3. Enter the password you set in Render
4. You'll stay logged in for 7 days

## Default Password (Development)

For local development, the default password is: `climbing123`

Set it in your `.env` file:
```
APP_PASSWORD=climbing123
JWT_SECRET=your-secret-key
```

## Security Notes

- The JWT token is stored in localStorage
- Token expires after 7 days
- All write operations (add climber, add session, delete) require authentication
- Read operations (view leaderboard, sessions) are public
- Change `JWT_SECRET` in production (Render auto-generates one)

## Logging Out

To log out, clear your browser's localStorage:
```javascript
localStorage.removeItem('boulderingelo_token');
```
Then refresh the page.
