import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ChevronLeft, 
  MapPin, 
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Activity,
  Download,
  Upload,
  Trophy,
  BarChart3,
  LineChart,
  History,
  CheckCircle2,
  DownloadCloud
} from "lucide-react";
import { format, subWeeks, startOfWeek, addDays, parseISO } from "date-fns";
import { 
  db, 
  calculatePace, 
  exportData, 
  exportGPX, 
  importBackup, 
  calculatePRs,
  calculateTrainingLoad
} from "@/lib/utils";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
} from 'recharts';

export const Route = createFileRoute("/history")({
  component: RunHistory,
  head: () => ({
    meta: [{ title: "Marathon Prep | Training History & Insights" }],
  }),
});

function RunHistory() {
  const activities = useLiveQuery(() => db.activities.orderBy('date').reverse().toArray()) || [];
  const plannedWorkouts = useLiveQuery(() => db.plannedWorkouts.toArray()) || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'prs' | 'details'>('list');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);


  const prs = calculatePRs(activities);

  // Chart Data Preparation
  const getLast8WeeksData = () => {
    const data = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      
      const weekActivities = activities.filter(a => {
        const d = parseISO(a.date);
        return d >= weekStart && d <= weekEnd;
      });
      
      const weekPlanned = plannedWorkouts.filter(w => {
        const d = parseISO(w.date);
        return d >= weekStart && d <= weekEnd;
      });

      const actualDist = weekActivities.reduce((sum, a) => sum + a.distanceKm, 0);
      const targetDist = weekPlanned.reduce((sum, w) => sum + (w.targetDistanceKm || 0), 0);

      data.push({
        name: format(weekStart, 'MMM d'),
        Actual: parseFloat(actualDist.toFixed(1)),
        Target: parseFloat(targetDist.toFixed(1)),
      });
    }
    return data;
  };

  const getPaceTrendData = () => {
    return activities
      .slice(0, 20)
      .reverse()
      .map(a => ({
        date: format(parseISO(a.date), 'MMM d'),
        pace: a.durationSeconds / a.distanceKm / 60, // minutes
        distance: a.distanceKm
      }));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      await importBackup(e.target.files[0]);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 lg:pb-8">
      <header className="p-6 flex flex-col gap-4 sticky top-0 bg-background/90 backdrop-blur-xl z-30 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="lg:hidden p-2.5 bg-secondary hover:bg-card rounded-2xl transition-all">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="font-black text-2xl uppercase tracking-tighter">History & Stats</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-secondary hover:bg-card rounded-xl transition-all"
              title="Import Backup"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button 
              onClick={exportData}
              className="p-2.5 bg-secondary hover:bg-card rounded-xl transition-all"
              title="Export All Data"
            >
              <DownloadCloud className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleImport} 
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-secondary/50 p-1 rounded-2xl">
          {(['list', 'stats', 'prs'] as const).map((tab) => (

            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-card text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'list' ? 'Activities' : tab === 'stats' ? 'Analytics' : 'Records'}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-8">
        {activeTab === 'list' && (
          <div className="grid gap-4 lg:grid-cols-2">
            {activities.length === 0 ? (
              <EmptyState />
            ) : (
              activities.map((activity) => (
                <ActivityListItem 
                  key={activity.id} 
                  activity={activity} 
                  onSelect={(a) => {
                    setSelectedActivity(a);
                    setActiveTab('details');
                  }}
                />
              ))

            )}
          </div>
        )}

        {activeTab === 'details' && selectedActivity && (
          <div className="p-4">
            <button 
              onClick={() => {
                setActiveTab('list');
                setSelectedActivity(null);
              }}
              className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to List
            </button>
            <ActivityDetails activity={selectedActivity} />
          </div>
        )}


        {activeTab === 'stats' && (
          <div className="space-y-8">
            <TrainingLoadChart activities={activities} />

            {/* Weekly Volume */}
            <section className="bg-card border border-border rounded-[40px] p-8 shadow-sm">
              <h3 className="font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Weekly Volume (km)
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getLast8WeeksData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', fontSize: '10px', fontWeight: 900 }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="Actual" fill="oklch(0.65 0.25 35)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Target" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Pace Trend */}
            <section className="bg-card border border-border rounded-[40px] p-8 shadow-sm">
              <h3 className="font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-cyan-400" />
                Pace Progression (min/km)
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={getPaceTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      reversed
                      tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', fontSize: '10px', fontWeight: 900 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pace" 
                      stroke="oklch(0.7 0.2 200)" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: 'oklch(0.7 0.2 200)' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'prs' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <PRCard 
              label="Longest Run" 
              value={prs.longestRun.value ? `${prs.longestRun.value.toFixed(1)} km` : '-'} 
              date={prs.longestRun.date} 
            />
            <PRCard 
              label="Best 5k Pace" 
              value={prs.fastest5k.value !== Infinity ? `${formatPace(prs.fastest5k.value)} /km` : '-'} 
              date={prs.fastest5k.date} 
            />
            <PRCard 
              label="Best 10k Pace" 
              value={prs.fastest10k.value !== Infinity ? `${formatPace(prs.fastest10k.value)} /km` : '-'} 
              date={prs.fastest10k.date} 
            />
            <PRCard 
              label="Half Marathon Pace" 
              value={prs.fastestHalf.value !== Infinity ? `${formatPace(prs.fastestHalf.value)} /km` : '-'} 
              date={prs.fastestHalf.date} 
            />
          </div>
        )}
      </main>
    </div>
  );
}

function ActivityListItem({ activity, onSelect }: { activity: any, onSelect: (a: any) => void }) {
  return (
    <div 
      className="bg-card p-6 rounded-[32px] border border-border space-y-6 group hover:border-primary/50 transition-all shadow-sm cursor-pointer"
      onClick={() => onSelect(activity)}
    >


      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${activity.type === 'long' ? 'bg-orange-500 animate-pulse' : 'bg-primary'}`} />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{activity.type} Run</span>
          </div>
          <div className="text-4xl font-black tracking-tighter text-foreground">
            {activity.distanceKm} <span className="text-lg text-muted-foreground">km</span>
          </div>
          <div className="text-[10px] font-black text-muted-foreground flex items-center gap-2 mt-2 uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            {format(parseISO(activity.date), 'EEEE, MMM do')}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${
            activity.perceivedEffort <= 3 ? 'bg-green-500/10 text-green-500' :
            activity.perceivedEffort >= 8 ? 'bg-red-500/10 text-red-500' :
            'bg-blue-500/10 text-blue-500'
          } border border-current/10`}>
            Effort: {activity.perceivedEffort}/10
          </div>
          {activity.isGpsTracked && (
             <button 
                onClick={() => exportGPX(activity)}
                className="p-2 bg-secondary/50 hover:bg-primary/20 hover:text-primary rounded-xl transition-all"
                title="Download GPX"
             >
                <Download className="w-3.5 h-3.5" />
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-secondary rounded-2xl">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Duration</div>
            <div className="font-black text-sm tabular-nums">{formatDuration(activity.durationSeconds)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-secondary rounded-2xl">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Avg Pace</div>
            <div className="font-black text-sm tabular-nums">{calculatePace(activity.distanceKm, activity.durationSeconds)} /km</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitRow({ split, index, maxPace }: { split: any, index: number, maxPace: number }) {
  const pace = split.time / split.dist;
  const paceFormatted = formatPace(pace);
  
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-6 text-[10px] font-black text-muted-foreground uppercase">{index + 1}</div>
      <div className="flex-1 h-8 bg-secondary/50 rounded-lg overflow-hidden relative">
        <div 
          className="h-full bg-primary/20 border-r-2 border-primary transition-all duration-500" 
          style={{ width: `${Math.min(100, (maxPace / pace) * 100)}%` }}
        />
        <div className="absolute inset-y-0 left-3 flex items-center">
          <span className="text-[10px] font-black uppercase tracking-widest">{split.dist.toFixed(1)} km</span>
        </div>
        <div className="absolute inset-y-0 right-3 flex items-center">
          <span className="text-[10px] font-black tabular-nums">{paceFormatted} /km</span>
        </div>
      </div>
    </div>
  );
}

function ActivityDetails({ activity }: { activity: any }) {
  // Simplified split calculation (1km chunks)
  const splits = [];
  const totalKm = Math.floor(activity.distanceKm);
  const avgPace = activity.durationSeconds / activity.distanceKm;
  
  for (let i = 0; i < totalKm; i++) {
    splits.push({ dist: 1, time: avgPace }); // Simplified
  }
  if (activity.distanceKm > totalKm) {
    splits.push({ dist: activity.distanceKm - totalKm, time: avgPace * (activity.distanceKm - totalKm) });
  }

  const maxPace = avgPace * 1.2; // Reference for bars

  return (
    <div className="bg-card p-6 rounded-[32px] border border-border space-y-8 animate-in fade-in zoom-in-95 duration-300">
       <div className="space-y-4">
        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">1km Splits</h4>
        <div className="space-y-2">
          {splits.map((s, i) => (
            <SplitRow key={i} split={s} index={i} maxPace={maxPace} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Effort Analysis</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
             <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Suffer Score</div>
             <div className="text-xl font-black text-orange-500">{(activity.durationSeconds/60 * activity.perceivedEffort/10 * 10).toFixed(0)}</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
             <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Relative Effort</div>
             <div className="text-xl font-black text-primary uppercase">{activity.perceivedEffort > 7 ? 'Hard' : activity.perceivedEffort > 4 ? 'Moderate' : 'Easy'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


function PRCard({ label, value, date }: any) {
  return (
    <div className="bg-card p-8 rounded-[40px] border border-border group hover:border-primary transition-all relative overflow-hidden shadow-sm">
      <div className="relative z-10">
        <div className="p-3 bg-primary/10 rounded-2xl w-fit mb-6 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{label}</div>
        <div className="text-3xl font-black tracking-tighter text-foreground mb-4">{value}</div>
        {date && (
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Set on {format(parseISO(date), 'MMM d, yyyy')}
          </div>
        )}
      </div>
      <Activity className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 rotate-12 group-hover:rotate-0 transition-transform pointer-events-none" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24 opacity-30 flex flex-col items-center justify-center col-span-full">
      <div className="w-24 h-24 bg-secondary rounded-[40px] flex items-center justify-center mb-6">
        <History className="w-12 h-12" />
      </div>
      <p className="font-black text-sm uppercase tracking-[0.2em]">No activities logged yet.</p>
      <Link to="/record" className="mt-6 text-primary font-black text-xs uppercase tracking-widest hover:underline">
        Log your first run
      </Link>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(paceSecs: number) {
  const mins = Math.floor(paceSecs / 60);
  const secs = Math.round(paceSecs % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function TrainingLoadChart({ activities }: { activities: any[] }) {
  const loadData = calculateTrainingLoad(activities);
  
  return (
    <section className="bg-card border border-border rounded-[40px] p-8 shadow-sm">
      <h3 className="font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Fitness & Freshness
      </h3>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={loadData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #333', fontSize: '10px', fontWeight: 900 }}
            />
            <Line type="monotone" dataKey="fitness" name="Fitness" stroke="#22c55e" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="#ef4444" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="form" name="Form" stroke="#3b82f6" strokeWidth={3} dot={false} />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Fitness (CTL)</div>
          <div className="text-xl font-black">{loadData[loadData.length-1]?.fitness || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Fatigue (ATL)</div>
          <div className="text-xl font-black">{loadData[loadData.length-1]?.fatigue || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Form (TSB)</div>
          <div className="text-xl font-black">{loadData[loadData.length-1]?.form || 0}</div>
        </div>
      </div>
    </section>
  );
}

