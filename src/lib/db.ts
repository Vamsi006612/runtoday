// src/lib/db.ts
import Dexie, { type Table } from 'dexie';

export interface Activity {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  date: string;
  title: string;
  type: string;
  avgPaceSecondsPerKm: number;
  elevationGain: number;
  perceivedEffort: number;
  notes: string;
  routeCoordinates: [number, number][];
  isGpsTracked: boolean;
  syncStatus: 'synced' | 'pending'; // New field for sync pattern
}

export interface PlannedWorkout {
  id: string;
  date: string;
  type: string;
  targetDistanceKm: number;
  completedActivityId?: string | null;
  status: 'planned' | 'completed';
}

export interface Goal {
  id: string;
  name: string;
  targetDate: string;
  targetValue: number;
}

export class MarathonDatabase extends Dexie {
  activities!: Table<Activity>;
  plannedWorkouts!: Table<PlannedWorkout>;
  goals!: Table<Goal>;
  routes!: Table<any>;
  segments!: Table<any>;
  segmentEfforts!: Table<any>;

  constructor() {
    super('MarathonDatabase');
    this.version(4).stores({
      activities: 'id, date, syncStatus',
      plannedWorkouts: 'id, date',
      goals: 'id',
      routes: 'id',
      segments: 'id',
      segmentEfforts: 'id, activityId'
    });
  }
}

export const db = new MarathonDatabase();
