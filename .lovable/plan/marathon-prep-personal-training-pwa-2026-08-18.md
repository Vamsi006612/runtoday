# Marathon Prep - Personal Training PWA

Build a modern, private running training app focused on marathon preparation for January 25, 2027.

## User Experience
- **Dashboard**: High-level stats, marathon countdown, and current streak.
- **Activity Logging**: Quick manual entry and real-time GPS tracking with Leaflet.js.
- **Training Plan**: Flexible weekly schedule for easy runs, long runs, and intervals.
- **Analytics**: Historical data, pace trends, and goal progress visualization.
- **Design**: Premium dark-mode athletic aesthetic, mobile-first, and distraction-free.

## Technical Details
- **Frontend**: TanStack Start (React 19), Tailwind CSS v4, Lucide icons.
- **Mapping**: Leaflet.js with OpenStreetMap for route visualization.
- **Data**: Local-first persistence using `localStorage` or `IndexedDB`.
- **Offline**: PWA capabilities for training on the go.

## Implementation Steps

### 1. Foundation & Design System
- Define the dark-mode-first color palette and typography in `src/styles.css`.
- Set up core UI components (Cards, Buttons, Inputs) using Shadcn patterns.
- Initialize local storage helpers for runs and training plans.

### 2. Dashboard & Navigation
- Implement `src/routes/index.tsx` as the main dashboard.
- Add the countdown timer for January 25, 2027.
- Create a bottom navigation bar for mobile-first accessibility.

### 3. Activity Logging & Mapping
- Build the manual run entry form.
- Integrate Leaflet.js for route recording and display.
- Implement the "Record Run" flow with GPS simulation/tracking.

### 4. Training & Progress
- Create the weekly training plan interface.
- Implement history view with charts (using simple Tailwind/SVG for light weight).
- Add goal setting and progress visualization.

### 5. PWA & Finishing Touches
- Add motivational messaging and polish animations.
- Implement data export (JSON/GPX).
