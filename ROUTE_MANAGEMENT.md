# Route Management Guide

## Overview
The Route Management feature allows administrators to dynamically configure the total number of routes available for each color across different wall sections. This is useful when routes are rotated weekly on different sections of the climbing wall.

## Features

### 1. Dynamic Wall Sections
- **Default Sections**: overhang, midWall, sideWall
- **Expandable**: Can add up to 7 or more sections as needed
- **Customizable Names**: Name sections based on your gym layout (e.g., section1, section2, westWall, cave, etc.)
- **Rename Sections**: Update section names without losing data

### 2. Per-Color Route Totals
For each wall section, you can set the number of routes for:
- Green
- Blue
- Yellow
- Orange
- Red
- Black

### 3. Automatic Expiry & Reset
- **Set Expiry Dates**: Configure when routes should automatically reset to 0
- **Automatic Checks**: System checks daily at midnight for expired sections
- **Manual Reset**: Clear expiry dates or reset sections manually
- **Perfect for Rotation**: Align with your gym's weekly/bi-weekly route setting schedule

### 4. Persistent Storage
- All route totals are saved in browser localStorage
- Expiry dates are also persisted locally
- Changes persist across sessions
- Each user's browser maintains its own configuration

## How to Use

### Accessing Route Management
1. Log in as an admin user
2. Click **Admin Panel** in the navigation
3. Select the **Routes** tab

### Adding a New Wall Section
1. In the "Add New Wall Section" area, enter a section name (e.g., "section4", "westWall")
2. Click **Add Section**
3. The new section appears with all colors set to 0 routes
4. Edit each color's route count as needed

### Renaming a Wall Section
1. Find the section you want to rename
2. Click the **Rename** button next to the section name
3. Enter the new name in the input field
4. Click **Save** to confirm or **Cancel** to abort
5. ✅ All route totals and expiry dates are preserved during rename

### Setting an Expiry Date
1. Find the section you want to set an expiry for
2. In the "Expiry Date" field, select a date from the date picker
3. The expiry date is saved automatically
4. You'll see a message: "Routes will reset to 0 on [date]"
5. On the expiry date, all routes in that section automatically reset to 0

**Use Case Example:**
- Set routes on Monday for section1
- Set expiry date to next Monday
- System automatically resets section1 to 0 on the expiry date
- Perfect for weekly rotation schedules!

### Clearing an Expiry Date
1. Find the section with an expiry date
2. Click the **Clear** button next to the date
3. The expiry date is removed and routes will not auto-reset

### Editing Route Totals
1. Find the wall section you want to edit
2. For each color, enter the total number of routes available
3. Changes are saved automatically as you type
4. The totals will be reflected in:
   - Session input (maximum values)
   - Profile "Current Climbs" section
   - Analytics displays

### Deleting a Wall Section
1. Find the section you want to remove
2. Click **Delete** (now changed from "Delete Section")
3. Confirm the deletion
4. ⚠️ **Warning**: This cannot be undone!
5. Both route totals and expiry dates are removed

### Resetting to Defaults
1. Click **Reset to Defaults** button (top right of Routes tab)
2. Confirm the reset
3. All sections will revert to:
   - overhang: yellow(7), orange(5), others(0)
   - midWall: yellow(20), orange(13), others(0)
   - sideWall: yellow(11), orange(8), others(0)
4. All expiry dates are cleared

## Use Case: Weekly Rotation (7 Sections)

### Setup
If your gym rotates routes weekly across 7 different sections:

1. Add sections: section1, section2, section3, section4, section5, section6, section7
2. For each section, set the route totals based on what's currently on the wall
3. Set expiry dates for sections that will be reset next week

### Weekly Workflow
**Monday (Route Setting Day):**
1. Routes in section1 are being reset today
2. Set expiry date for section1 to next Monday
3. Update route totals for section1 with new counts
4. Section7 (set last Monday) will auto-expire next Monday

**Throughout the Week:**
- Climbers log sessions normally
- System tracks progress against current route totals
- No manual intervention needed

**Next Monday:**
- System automatically resets section7 to 0 (expired)
- You set new routes in section7 and update totals
- Set expiry for section7 to the following Monday
- Cycle continues!

## Automatic Expiry System

### How It Works
1. **On Page Load**: System checks all expiry dates immediately
2. **Daily Checks**: System schedules a check for midnight each day
3. **Reset Action**: When an expiry date is reached:
   - All route counts for that section reset to 0
   - The expiry date is removed
   - Admin sees an alert notification
4. **Timezone**: Uses browser's local timezone

### Important Notes
- Expiry checks happen when the page is loaded or at midnight
- If the browser/tab is closed at midnight, the check happens on next page load
- Routes reset at the START of the expiry date (00:00:00)
- After reset, you can immediately set new routes and a new expiry date

## Technical Details

### Data Structure
```javascript
// Wall Totals
{
  "sectionName": {
    "green": 0,
    "blue": 0,
    "yellow": 7,
    "orange": 5,
    "red": 0,
    "black": 0
  },
  // ... more sections
}

// Expiry Dates
{
  "sectionName": "2025-11-11",  // ISO date string
  "section2": "2025-11-18",
  // ... more sections
}
```

### Storage Location
- **Wall Totals Key**: `wallTotals` in localStorage
- **Expiry Dates Key**: `wallExpiryDates` in localStorage
- **Format**: JSON strings
- **Scope**: Per-browser (not synchronized across devices/users)

### Integration Points
1. **Session Input**: Maximum allowed climbs per color validated against totals
2. **Profile View**: "Current Climbs" shows `X/Total` format
3. **Analytics**: Uses totals for completion percentage calculations
4. **Auto-Reset**: Expired sections automatically zero out route counts

## Best Practices

1. **Naming Conventions**: Use clear, consistent names for wall sections
2. **Set Expiry Dates**: Always set expiry dates to match your route setting schedule
3. **Weekly Routine**: Update route totals and expiry dates on the same day each week
4. **Backup Configuration**: Take screenshots or notes of your configuration
5. **Team Communication**: Ensure all admins understand the current section setup
6. **Check After Expiry**: After a section expires, verify the reset and set new totals

## Advanced Usage

### Staggered Rotation Schedule
If different sections reset on different days:
- Section 1, 2, 3: Reset Mondays (set expiry to Monday)
- Section 4, 5: Reset Wednesdays (set expiry to Wednesday)  
- Section 6, 7: Reset Fridays (set expiry to Friday)

The system handles multiple expiry dates automatically!

### Bi-Weekly Rotation
Set expiry dates 2 weeks out for sections that rotate every other week.

### No Expiry for Permanent Routes
Some sections may have long-term routes (e.g., training wall). Simply don't set an expiry date for those sections.

## Troubleshooting

**Q: Section didn't reset on expiry date**  
A: The browser must load the page to trigger the check. Open the app after midnight or on the expiry date.

**Q: Lost my configuration after clearing browser data**  
A: localStorage is cleared with browser data. Consider taking regular screenshots of your setup.

**Q: Can I sync expiry dates between multiple admin accounts?**  
A: Not currently - each browser maintains its own localStorage. Future versions may add backend storage.

**Q: What happens to old sessions after a section is renamed?**  
A: Old session data is preserved with the original section names in the database. The rename only affects the current route management UI.

## Limitations

- Configuration is stored locally in each browser (not shared between admins)
- Expiry checks require the page to be loaded
- No export/import functionality (yet)
- Deleting a section cannot be undone
- Old sessions retain their original wall section names (historical data preserved)
