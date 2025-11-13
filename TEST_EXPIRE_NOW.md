# Expire Now — Retired

The `Expire Now` feature and related tests have been removed from the application. This document is retained for historical reference only.

If you need to reintroduce automated expiry behavior, please open an issue describing the desired workflow and scheduling semantics.
```markdown
# Expire Now — Retired

The `Expire Now` feature and related tests have been removed from the application.

This test document is retained for historical reference but is no longer applicable.

If you need to reintroduce automated expiry behavior, open an issue describing the desired workflow and scheduling semantics.

```
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
# Expire Now — Retired

The `Expire Now` feature and related tests have been removed from the application. This document is retained for historical reference only.

If you need to reintroduce automated expiry behavior, please open an issue describing the desired workflow and scheduling semantics.
**OLD CODE (❌ BROKEN):**

