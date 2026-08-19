# Marathon Prep: Production-Quality PWA Implementation

Refine the "Marathon Prep" application into a serious, production-grade training tool. This plan focuses on data integrity (IndexedDB), high-accuracy tracking, professional UI polish, and deep training insights.

## Core Infrastructure & Data
- **Reliable Storage**: Move from `localStorage` to **IndexedDB** using `dexie` for large-scale data integrity (routes, multi-month history).
- **Data Export**: Implement JSON/GPX export for runs to ensure data ownership.
- **Offline First**: Ensure the PWA handles offline states gracefully for logging and viewing history.

## Activity Tracking (High Accuracy)
- **Geospatial Precision**: Use proper Haversine formula for distance calculation instead of simple increments.
- **GPS Reliability**: Implement robust handling of location permissions, GPS accuracy filtering (ignoring low-accuracy pings), and battery-saving considerations.
- **Recording Flow**: Add "Pause/Resume" states that correctly handle distance gaps.
- **Post-Run Analysis**: Detailed summary with interactive Leaflet maps, elevation gain (via API or GPS), and perceived effort (RPE) logging.

## Dashboard & Training Logic
- **Training Insights**: Implement streak tracking, weekly/monthly aggregations, and progress bars.
- **Marathon Countdown**: Fixed to Jan 25, 2027.
- **Dynamic Weekly Plan**: Allow users to edit their training schedule (Easy, Long, Tempo, Intervals) and mark completion.

## UI/UX Refinement
- **Athletic Aesthetic**: Dark-mode-first, high-contrast, professional design with large touch targets for sweaty fingers.
- **Loading & Empty States**: Add polished skeletons and informative empty states for all views.
- **Responsive PWA**: Ensure standalone mobile experience is flawless (status bar, safe areas, splash screen).

## Technical Details
- **Tech Stack**: TanStack Start, React 19, Tailwind CSS v4, Leaflet.js, Lucide Icons.
- **Data Model**:
  ```typescript
  interface Run {
    id: string;
    distance: number; // km
    duration: number; // ms
    startTime: string; // ISO
    endTime: string;
    pace: string;
    elevation: number;
    notes: string;
    rpe: 1-10; // Perceived effort
    route: [number, number][]; // Lat/Lng
  }
  ```
- **IndexedDB Schema**:
  - `runs`: Stores all run data and full route polylines.
  - `plans`: Weekly training blocks.
  - `goals`: User-defined targets.

## User Review Required
- **Training Plan**: Should I pre-populate a standard 16-week marathon plan or let you build it manually?
- **Elevation Data**: Do you require real-time elevation, or is post-run calculation acceptable?
