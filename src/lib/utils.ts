// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { startOfWeek, subDays, format } from "date-fns";
import { db, type Activity } from './db';

export { db, type Activity };

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
}

export function calculatePace(distanceKm: number, durationSeconds: number) {
  if (distanceKm === 0) return "0:00";
  const paceSecondsPerKm = durationSeconds / distanceKm;
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getWeeklyStats = (activities: any[]) => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  
  const weeklyActivities = activities.filter(activity => new Date(activity.date) >= weekStart);
  const distance = weeklyActivities.reduce((acc, activity) => acc + activity.distanceKm, 0);
  
  return {
    distance: parseFloat(distance.toFixed(1)),
    count: weeklyActivities.length
  };
};

export const getMonthlyStats = (activities: any[]) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthlyActivities = activities.filter(activity => new Date(activity.date) >= monthStart);
  const distance = monthlyActivities.reduce((acc, activity) => acc + activity.distanceKm, 0);
  
  return {
    distance: parseFloat(distance.toFixed(1)),
    count: monthlyActivities.length
  };
};

export const getTrainingStreak = (activities: any[]) => {
  if (activities.length === 0) return 0;
  
  const activitiesByWeek = activities.reduce((acc: any, activity) => {
    const weekStart = format(startOfWeek(new Date(activity.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    acc[weekStart] = (acc[weekStart] || 0) + 1;
    return acc;
  }, {});

  let streak = 0;
  let currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  while (activitiesByWeek[format(currentWeek, 'yyyy-MM-dd')]) {
    streak++;
    currentWeek = subDays(currentWeek, 7);
  }

  return streak;
};

export const getAveragePaceLast30Days = (activities: any[]) => {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentActivities = activities.filter(a => new Date(a.date) >= thirtyDaysAgo);
  
  if (recentActivities.length === 0) return "0:00";
  
  const totalDistance = recentActivities.reduce((acc, a) => acc + a.distanceKm, 0);
  const totalDuration = recentActivities.reduce((acc, a) => acc + a.durationSeconds, 0);
  
  if (totalDistance === 0) return "0:00";
  
  const avgPaceSeconds = totalDuration / totalDistance;
  const mins = Math.floor(avgPaceSeconds / 60);
  const secs = Math.round(avgPaceSeconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getMarathonBlockProgress = (marathonDate: Date) => {
  const blockSizeWeeks = 20;
  const blockStart = subDays(marathonDate, blockSizeWeeks * 7);
  const now = new Date();
  
  if (now < blockStart) return 0;
  if (now > marathonDate) return 100;
  
  const totalDays = blockSizeWeeks * 7;
  const daysPassed = Math.floor((now.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.min(100, Math.round((daysPassed / totalDays) * 100));
};

export const exportData = async () => {
  const { db } = await import('./db');
  const activities = await db.activities.toArray();
  const plannedWorkouts = await db.plannedWorkouts.toArray();
  const goals = await db.goals.toArray();
  
  const data = { activities, plannedWorkouts, goals, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marathon-prep-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportGPX = (activity: any) => {
  if (!activity.routeCoordinates || activity.routeCoordinates.length === 0) return;
  
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Marathon Prep" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${activity.title}</name>
    <time>${activity.date}</time>
  </metadata>
  <trk>
    <name>${activity.title}</name>
    <trkseg>
      ${activity.routeCoordinates.map((coord: [number, number]) => `
      <trkpt lat="${coord[0]}" lon="${coord[1]}">
        <time>${activity.date}</time>
      </trkpt>`).join('')}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-${activity.id}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importBackup = async (file: File) => {
  const { db } = await import('./db');
  const text = await file.text();
  const data = JSON.parse(text);
  
  if (data.activities) await db.activities.bulkPut(data.activities);
  if (data.plannedWorkouts) await db.plannedWorkouts.bulkPut(data.plannedWorkouts);
  if (data.goals) await db.goals.bulkPut(data.goals);
};

export const calculatePRs = (activities: any[]) => {
  const prs = {
    longestRun: { value: 0, date: '', id: '' },
    fastest5k: { value: Infinity, date: '', id: '' },
    fastest10k: { value: Infinity, date: '', id: '' },
    fastestHalf: { value: Infinity, date: '', id: '' },
    fastestMarathon: { value: Infinity, date: '', id: '' },
  };

  activities.forEach(a => {
    if (a.distanceKm > prs.longestRun.value) {
      prs.longestRun = { value: a.distanceKm, date: a.date, id: a.id };
    }
    
    const pace = a.durationSeconds / a.distanceKm;
    
    if (a.distanceKm >= 5 && pace < prs.fastest5k.value) {
      prs.fastest5k = { value: pace, date: a.date, id: a.id };
    }
    if (a.distanceKm >= 10 && pace < prs.fastest10k.value) {
      prs.fastest10k = { value: pace, date: a.date, id: a.id };
    }
    if (a.distanceKm >= 21.1 && pace < prs.fastestHalf.value) {
      prs.fastestHalf = { value: pace, date: a.date, id: a.id };
    }
    if (a.distanceKm >= 42.2 && pace < prs.fastestMarathon.value) {
      prs.fastestMarathon = { value: pace, date: a.date, id: a.id };
    }
  });


  return prs;
};

export const calculateTrainingLoad = (activities: Activity[]) => {
  const sorted = [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length === 0) return [];

  const getSufferScore = (a: Activity) => {
    return (a.durationSeconds / 60) * (a.perceivedEffort / 10) * 10;
  };

  let ctl = 0;
  let atl = 0;
  
  const history = sorted.map(a => {
    const score = getSufferScore(a);
    const date = new Date(a.date);
    ctl = ctl + (score - ctl) / 42;
    atl = atl + (score - atl) / 7;
    
    return {
      date: format(date, 'yyyy-MM-dd'),
      fitness: parseFloat(ctl.toFixed(1)),
      fatigue: parseFloat(atl.toFixed(1)),
      form: parseFloat((ctl - atl).toFixed(1))
    };
  });

  return history;
};

export const calculateBestEfforts = (coordinates: [number, number][], date: string, activityId: string) => {
  return [];
};

export const findSegmentMatches = async (route: [number, number][], activityId: string, date: string) => {
  const segments = await db.segments.toArray();
  const matches = [];

  for (const segment of segments) {
    const startIndex = route.findIndex(p => calculateDistance(p[0], p[1], segment.startPoint[0], segment.startPoint[1]) < 0.03);
    const endIndex = route.findIndex(p => calculateDistance(p[0], p[1], segment.endPoint[0], segment.endPoint[1]) < 0.03);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      matches.push({
        id: crypto.randomUUID(),
        segmentId: segment.id,
        activityId,
        date,
        timeSeconds: endIndex - startIndex,
        distanceKm: segment.distanceKm
      });
    }
  }

  if (matches.length > 0) {
    await db.segmentEfforts.bulkAdd(matches);
  }
  return matches;
};
