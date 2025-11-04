# Route Management Guide

## Overview
The Route Management feature allows administrators to dynamically configure the total number of routes available for each color across different wall sections. This is useful when routes are rotated weekly on different sections of the climbing wall.

## Features

### 1. Dynamic Wall Sections
- **Default Sections**: overhang, midWall, sideWall
- **Expandable**: Can add up to 7 or more sections as needed
- **Customizable Names**: Name sections based on your gym layout (e.g., section1, section2, westWall, cave, etc.)

### 2. Per-Color Route Totals
For each wall section, you can set the number of routes for:
- Green
- Blue
- Yellow
- Orange
- Red
- Black

### 3. Persistent Storage
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
2. Click **Delete Section**
3. Confirm the deletion
4. ⚠️ **Warning**: This cannot be undone!

### Resetting to Defaults
1. Click **Reset to Defaults** button (top right of Routes tab)
2. Confirm the reset
3. All sections will revert to:
   - overhang: yellow(7), orange(5), others(0)
   - midWall: yellow(20), orange(13), others(0)
   - sideWall: yellow(11), orange(8), others(0)

## Use Case: Weekly Rotation (7 Sections)

If your gym rotates routes weekly across 7 different sections:

1. Add sections: section1, section2, section3, section4, section5, section6, section7
2. For the current week's sections, set route totals to actual counts
3. For sections being reset/rotated, set totals to 0 or remove them
4. Update the configuration each week as routes are changed

## Technical Details

### Data Structure
```javascript
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
```

### Storage Location
- **Key**: `wallTotals` in localStorage
- **Format**: JSON string
- **Scope**: Per-browser (not synchronized across devices/users)

### Integration Points
1. **Session Input**: Maximum allowed climbs per color validated against totals
2. **Profile View**: "Current Climbs" shows `X/Total` format
3. **Analytics**: Uses totals for completion percentage calculations

## Best Practices

1. **Naming Conventions**: Use clear, consistent names for wall sections
2. **Weekly Updates**: Update totals when routes are changed/rotated
3. **Backup Configuration**: Take screenshots or notes of your configuration
4. **Team Communication**: Ensure all admins understand the current section setup

## Limitations

- Configuration is stored locally in each browser (not shared between admins)
- No export/import functionality (yet)
- Deleting a section cannot be undone
- Old sessions retain their original wall section names (historical data preserved)
