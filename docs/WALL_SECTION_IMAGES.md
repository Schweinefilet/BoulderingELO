# Wall Section Reference Images Feature

## Overview
Admins can now upload reference images for each wall section to help climbers identify which physical wall corresponds to which section in the app.

## Features

### For Admins
1. **Upload Wall Section Images**
   - Navigate to Admin Panel → "Routes" tab
   - Find the wall section you want to add an image for
   - Under "📸 Wall Section Reference Image", paste the image URL
   - The image will be saved automatically as you type
   - Supported formats: HEIF, HEIC, JPG, PNG (any format your browser can display)

2. **Image Preview**
   - Images are previewed directly in the admin panel
   - Maximum height: 200px for easy viewing

3. **Image Hosting**
   - Recommended: Upload to [Imgur](https://imgur.com) and use the direct link
   - Or use any publicly accessible image URL
   - The app stores the URL, not the actual image file

4. **Image Management**
   - When you rename a wall section, the image follows automatically
   - When you delete a wall section, the image is removed automatically

### For Climbers
1. **View Reference Images**
   - When logging a new session, select a wall section from the dropdown
   - If the admin has uploaded a reference image, it will appear below the dropdown
   - Shows in a blue-bordered box labeled "📍 Wall Section Reference"
   - Maximum height: 250px for clear visibility

## Technical Implementation

### Frontend Changes
- **State Management**: Added `wallSectionImages` state (Record<string, string>)
- **API Functions**: 
  - `api.getWallSectionImages()` - Load images on startup
  - `api.saveWallSectionImages()` - Save images to database
- **Admin UI**: Image upload input with preview in Route Management tab
- **Climber UI**: Reference image display in New Session section

### Backend Changes
- **New Endpoints**:
  - `GET /api/settings/wall-section-images` - Retrieve images (public)
  - `POST /api/settings/wall-section-images` - Update images (admin only)
- **Database**: Images stored in `settings` table with key `wallSectionImages`

### Data Flow
1. Admin pastes image URL → Saved to database immediately
2. On app load → Images fetched alongside wall totals
3. Climber selects wall → Reference image displays if available
4. Wall renamed/deleted → Image automatically updated/removed

## Example Use Case
1. Admin uploads photo of "overhang" wall section
2. Climber opens New Session page
3. Climber selects "Overhang" from dropdown
4. Photo of the overhang wall appears below
5. Climber can now confidently identify which climbs to log

## Notes
- Images are optional - wall sections work without them
- Only admins can upload/edit images
- Images are shared across all users
- No file upload needed - just paste a URL
- Browser handles all image format compatibility
