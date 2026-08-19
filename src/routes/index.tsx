import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, differenceInDays, startOfWeek, addDays, isSameDay } from "date-fns";
import { 
  Activity, 
  ChevronRight, 
  Plus, 
  Trophy, 
  TrendingUp,
  MapPin,
  Calendar,
  Clock,
  Zap,
  Flame,
  WifiOff
} from "lucide-react";
import { 
  calculatePace, 
  db, 
  getWeeklyStats, 
  getMonthlyStats, 
  getTrainingStreak, 
  getAveragePaceLast30Days, 
  getMarathonBlockProgress 
} from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";


export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Marathon Prep | Dashboard" },
      { name: "description", content: "Your personal marathon training command center." },
      { property: "og:title", content: "Marathon Prep" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Dashboard() {
  const activities = useLiveQuery(() => db.activities.orderBy('date').reverse().toArray()) || [];
  const plannedWorkouts = useLiveQuery(() => db.plannedWorkouts.toArray()) || [];
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const marathonDate = new Date("2027-01-25");
  const today = new Date();
  const daysRemaining = Math.max(0, differenceInDays(marathonDate, today));
  const weeksRemaining = Math.ceil(daysRemaining / 7);
  const blockProgress = getMarathonBlockProgress(marathonDate);

  const weeklyStats = getWeeklyStats(activities);
  const monthlyStats = getMonthlyStats(activities);
  const streak = getTrainingStreak(activities);
  const avgPace = getAveragePaceLast30Days(activities);
  const recentActivities = activities.slice(0, 3);
  
  const weeklyGoalValue = 40;
  
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  return (
    <div className="flex flex-col min-h-screen pb-24 lg:pb-8">
      <header className="p-6 bg-card/50 backdrop-blur-md sticky top-0 z-30 border-b border-border/50 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Welcome back, athlete.</p>
        </div>
        {!isOnline && (
          <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20">
            <WifiOff className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase">Offline</span>
          </div>
        )}
      </header>

      <main className="p-4 space-y-6">
        {/* Countdown Card */}
        <section className="bg-primary text-primary-foreground p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Days to Marathon</h2>
                  <div className="text-8xl font-black mt-2 tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500 leading-none">
                    {daysRemaining}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Weeks</div>
                  <div className="text-3xl font-black mt-1 tracking-tighter">
                    {weeksRemaining}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span>Training Block Progress</span>
                  <span>{blockProgress}%</span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                    style={{ width: `${blockProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 w-fit">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                January 25, 2027 • Valencia
              </p>
            </div>
          </div>
          <Activity className="absolute -right-8 -bottom-8 w-64 h-64 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
        </section>

        {/* Glance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <GlanceCard 
            icon={<Zap className="w-4 h-4" />} 
            label="This Week" 
            value={`${weeklyStats.distance}`} 
            unit="km"
            subtext={`Goal: ${weeklyGoalValue}km`}
            progress={(weeklyStats.distance / weeklyGoalValue) * 100}
          />
          <GlanceCard 
            icon={<Calendar className="w-4 h-4" />} 
            label="This Month" 
            value={`${monthlyStats.distance}`} 
            unit="km"
            subtext={`${monthlyStats.count} runs total`}
          />
          <GlanceCard 
            icon={<Flame className="w-4 h-4" />} 
            label="Streak" 
            value={`${streak}`} 
            unit="weeks"
            subtext="Consistent prep"
          />
          <GlanceCard 
            icon={<Clock className="w-4 h-4" />} 
            label="Avg Pace" 
            value={avgPace} 
            unit="/km"
            subtext="Last 30 days"
          />
        </div>

        {/* Weekly Training Snapshot */}
        <section className="bg-card p-6 rounded-[32px] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Weekly Snapshot
            </h3>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
            </span>
          </div>
          
          <div className="flex justify-between items-center gap-1">
            {weekDays.map((day, i) => {
              const workout = plannedWorkouts.find(w => w.date === format(day, 'yyyy-MM-dd'));
              const isToday = isSameDay(day, today);
              const isCompleted = workout?.completedActivityId;
              
              return (
                <div key={i} className="flex flex-col items-center gap-3 flex-1 min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE')[0]}
                  </span>
                  <Link 
                    to={workout ? "/plan" : "/record"}
                    className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all border ${
                      isCompleted 
                        ? 'bg-primary border-transparent text-primary-foreground' 
                        : isToday 
                          ? 'bg-secondary border-primary/50 text-primary animate-pulse' 
                          : workout 
                            ? 'bg-secondary/50 border-border text-foreground/50' 
                            : 'bg-transparent border-border/30 text-muted-foreground/20'
                    } group`}
                  >
                    {isCompleted ? (
                      <Trophy className="w-4 h-4" />
                    ) : workout ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <div>
              <h3 className="font-black text-xs uppercase tracking-[0.2em]">Recent Activities</h3>
            </div>
            <Link to="/history" className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-[40px] border border-dashed border-border group hover:border-primary/50 transition-colors">
              <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20 group-hover:scale-110 transition-transform" />
              <p className="text-muted-foreground font-bold text-sm">No runs logged yet. Time to hit the road!</p>
              <Link 
                to="/record"
                className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> Log your first run
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity: any) => (
                <ActivityCard key={activity.id} activity={activity} isOnline={isOnline} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <Link 
        to="/record"
        className="lg:hidden fixed bottom-24 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-[24px] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 rotate-45 group"
      >
        <Plus className="w-8 h-8 -rotate-45 group-hover:scale-110 transition-transform" />
      </Link>
    </div>
  );
}

function GlanceCard({ icon, label, value, unit, subtext, progress }: any) {
  return (
    <div className="bg-card p-6 rounded-[32px] border border-border group hover:border-primary/50 transition-all shadow-sm">
      <div className="text-muted-foreground mb-4 flex items-center justify-between">
        <div className="p-2 bg-secondary rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] font-black">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-3xl font-black tracking-tighter">{value}</div>
        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{unit}</div>
      </div>
      <div className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{subtext}</div>
      
      {progress !== undefined && (
        <div className="mt-4 h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000" 
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity, isOnline }: { activity: any; isOnline: boolean }) {
  return (
    <div className="bg-card p-5 rounded-[32px] border border-border flex items-center justify-between group hover:border-primary/50 hover:bg-secondary/10 transition-all shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-border/50 relative">
          <MapPin className="w-7 h-7 text-primary" />
          {activity.type === 'long' && (
            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-1 rounded-lg">
              <Trophy className="w-3 h-3" />
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-black text-sm uppercase tracking-tight">{activity.distanceKm} km {activity.type}</h4>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{calculatePace(activity.distanceKm, activity.durationSeconds)} /km</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {format(new Date(activity.date), 'MMM d')}
            </p>
            {!isOnline && (
              <WifiOff className="w-3 h-3 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex gap-1 mt-2">
            {activity.elevationGain > 50 && (
              <span className="text-[8px] font-black bg-secondary px-2 py-0.5 rounded-full uppercase tracking-tighter">Hilly</span>
            )}
            {activity.perceivedEffort >= 8 && (
              <span className="text-[8px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Hard</span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  );
}
