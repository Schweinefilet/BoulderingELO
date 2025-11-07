# Expire Now Button - Complete Fix

## What Was Fixed

### Issue
When clicking "⚡ Expire Now" button, climbs from the expired section were not being removed from users' Current Climbs and Leaderboard display.

### Root Cause
The order of operations was wrong - we were reloading data BEFORE the backend knew the section was expired, so the filters weren't applied.

### Solution
Changed the order in `manuallyExpireSection()`:

**OLD ORDER** (❌ Broken):
1. Update frontend state
2. Save to backend
3. Add to expired list
4. Reload data (but backend doesn't filter yet!)

**NEW ORDER** (✅ Fixed):
1. **Add to expired sections on backend FIRST**
2. **Get updated expired sections list**
3. Set expired sections state
4. Update wallTotals (set to null)
5. **Reload ALL data** (now properly filtered)
6. Remove from wallCounts
7. Show toast notification

## How It Works Now

When admin clicks "⚡ Expire Now" on a section (e.g., Mini Overhang):

1. **Backend** adds section to `expiredSections` list
2. **Backend** recalculates leaderboard excluding expired sections via `combineCounts(wallCounts, expiredSections)`
3. **Frontend** reloads sessions/leaderboard/climbers with filtered data
4. **Frontend** displays filtered data via `normalizeSessionCounts(session, expiredSections)`
5. **Result**: Orange climb (1/20) becomes (0/20), score decreases

## Verification

Test case: Fardeen Riaz Ahamed
- Before: 1/20 orange climbs on Mini Overhang
- Click "⚡ Expire Now" on Mini Overhang
- After: 0/20 orange climbs (removed from both Leaderboard and Current Climbs)

## Notifications

Two persistent notifications show expired sections:

1. **Top Banner** (below header)
   - Lists all expired sections
   - Explains score recalculation

2. **Sessions Section** (above session list)
   - Shows replaced sections
   - Reminds users climbs don't count

Both visible to ALL users, not just admin.

