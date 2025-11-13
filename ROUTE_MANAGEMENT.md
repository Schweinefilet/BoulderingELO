```markdown
# Route Management Guide

## Overview
Administrators can configure wall sections and per-color route totals. This document covers how to manage sections and route counts; the previous automatic expiry/auto-reset feature has been removed from the application.

## Features

- Dynamic wall sections: add, rename, and delete sections as needed
- Per-color route totals: set the number of routes for each color in a section
- Persistent storage: totals are saved in localStorage and persisted server-side for the app

## How to Use

### Accessing Route Management
1. Log in as an admin user
2. Click **Admin Panel** in the navigation
3. Select the **Routes** tab

### Adding a New Wall Section
1. Enter a section name (e.g., "section4", "westWall")
2. Click **Add Section**
3. The new section appears with all colors set to 0 routes

### Renaming a Wall Section
1. Find the section to rename
2. Click **Rename** next to the section name
3. Enter the new name and confirm
4. Session data is migrated to the new section name where applicable

### Editing Route Totals
1. For each section, update the number of routes per color
2. Changes are saved to the backend and reflected in session inputs and analytics

### Deleting a Wall Section
1. Click **Delete** for the target section
2. Confirm the deletion (irreversible)

### Resetting to Defaults
1. Click **Reset to Defaults** in the Routes tab
2. Confirm to revert to the default route totals

## Technical Details

### Data Structure
Wall totals are stored as a JSON object mapping section names to color totals.

### Storage Location
- **Wall Totals Key**: `wallTotals` (saved in backend and mirrored in localStorage)

## Best Practices

- Use clear, consistent section names
- Update route totals when rotating routes manually
- Back up important configuration externally if needed

## Notes
- The automatic expiry/reset functionality that previously allowed scheduling resets by date has been removed. Admins should use manual reset operations when rotating routes.

```
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
NOTE: The automatic expiry/auto-reset feature has been removed from the application. Any instructions below that reference setting expiry dates, automatic checks, or auto-resets are obsolete. Admins should manage route rotations manually using the route totals and reset functions in the Admin Panel.

### 4. Persistent Storage
- All route totals are saved in browser localStorage
 
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

# Route Management Guide

## Overview
Administrators can configure wall sections and per-color route totals. This document covers how to manage sections and route counts; the automatic expiry/auto-reset feature has been removed from the application.

## Features

- Dynamic wall sections: add, rename, and delete sections as needed
- Per-color route totals: set the number of routes for each color in a section
- Persistent storage: totals are saved in localStorage and persisted server-side for the app

## How to Use

### Accessing Route Management
1. Log in as an admin user
2. Click **Admin Panel** in the navigation
3. Select the **Routes** tab

### Adding a New Wall Section
1. Enter a section name (e.g., "section4", "westWall")
2. Click **Add Section**
3. The new section appears with all colors set to 0 routes

### Renaming a Wall Section
1. Find the section to rename
2. Click **Rename** next to the section name
3. Enter the new name and confirm
4. Session data is migrated to the new section name where applicable

### Editing Route Totals
1. For each section, update the number of routes per color
2. Changes are saved to the backend and reflected in session inputs and analytics

### Deleting a Wall Section
1. Click **Delete** for the target section
2. Confirm the deletion (irreversible)

### Resetting to Defaults
1. Click **Reset to Defaults** in the Routes tab
2. Confirm to revert to the default route totals

## Technical Details

### Data Structure
Wall totals are stored as a JSON object mapping section names to color totals.

### Storage Location
- **Wall Totals Key**: `wallTotals` (saved in backend and mirrored in localStorage)

## Best Practices

- Use clear, consistent section names
- Update route totals when rotating routes manually
- Back up important configuration externally if needed

## Notes

- The automatic expiry/reset functionality that previously allowed scheduling resets by date has been removed. Admins should use manual reset operations when rotating routes.

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
