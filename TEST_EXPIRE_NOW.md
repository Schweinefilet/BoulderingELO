# Test: Expire Now Button

## Test Case: Fardeen Riaz Ahamed - Mini Overhang

### Pre-Test State
- User: Fardeen Riaz Ahamed
- Section: Mini Overhang  
- Orange climbs: 1/20 (shown in both Leaderboard and Profile "Current Climbs")
- Score: includes points from that 1 orange climb

### Expected Behavior After Clicking "⚡ Expire Now" on Mini Overhang

#### 1. ✅ Wall Totals Reset to Null
- All route counts for Mini Overhang → `null` (shows as `?`)

#### 2. ✅ User Data Updated
**Leaderboard:**
- Orange count: 1 → **0** (climb removed)
- Score: decreases (orange points removed)

**Profile → Current Climbs:**
- Orange: 1/20 → **0/0** (numerator and denominator both become 0)
  - Numerator (1→0): Climb from expired section filtered out
  - Denominator (20→0): Section excluded from total calculation via `getTotalForColor()`

#### 3. ✅ Notifications Show
**Top Banner (below header):**
- Shows "⚠️ Wall Sections Replaced"
- Lists "Mini Overhang"
- Explains score recalculation

**Sessions Section:**
- Shows "⚠️ Replaced Sections: Mini Overhang"
- Note: "Climbs from these sections no longer count toward scores"

## Key Bug That Was Fixed

### The Problem
`getTotalForColor()` was summing ALL sections from `wallTotals` without filtering expired ones.

**OLD CODE (❌ BROKEN):**
```typescript
const getTotalForColor = (color: string): number => {
  return Object.values(wallTotals).reduce((sum, section) => {
    return sum + (section[color] || 0);
  }, 0);
};
```

**Result:** Mini Overhang with 20 orange routes still counted in denominator even when expired → showed 0/20

### The Fix
Filter out expired sections when calculating totals.

**NEW CODE (✅ FIXED):**
```typescript
const getTotalForColor = (color: string): number => {
  return Object.entries(wallTotals).reduce((sum, [section, counts]) => {
    // Skip expired sections when calculating totals
    if (expiredSections.includes(section)) {
      return sum;
    }
    return sum + (counts[color] || 0);
  }, 0);
};
```

**Result:** Expired sections excluded from denominator → shows 0/0 correctly

## Data Flow

### Backend
1. `addExpiredSection()` → adds section to `expiredSections` list
2. `leaderboard()` → recalculates scores via `combineCounts(wallCounts, expiredSections)`
3. Returns filtered data to frontend

### Frontend
1. Updates `expiredSections` state
2. `normalizeSessionCounts()` filters climbs from expired sections
3. `getTotalForColor()` excludes expired sections from totals
4. Displays updated counts: 0/0 for expired sections

## Verification Steps

1. Log in as Fardeen Riaz Ahamed
2. Check current state (should show 1/20 orange if not already expired)
3. Admin → Expire Mini Overhang
4. Verify:
   - Leaderboard shows 0 orange climbs
   - Profile shows 0/0 orange in Current Climbs
   - Top banner shows expired notice
   - Sessions section shows expired notice
   - Score decreased appropriately

