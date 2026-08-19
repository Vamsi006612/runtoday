import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { 
  ChevronLeft, 
  CheckCircle2, 
  Circle,
  Clock,
  Zap,
  Plus,
  Trophy,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  Trash2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { db } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { format, startOfWeek, addDays, differenceInWeeks, subWeeks, parseISO, isSameDay } from "date-fns";

export const Route = createFileRoute("/plan")({
  component: TrainingPlan,
  head: () => ({
    meta: [{ title: "Marathon Prep | Training Plan" }],
  }),
});

function TrainingPlan() {
  const marathonDate = new Date("2027-01-25");
  const plannedWorkouts = useLiveQuery(() => db.plannedWorkouts.orderBy('date').toArray()) || [];
  const activities = useLiveQuery(() => db.activities.orderBy('date').reverse().toArray()) || [];
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const generateBaselinePlan = async () => {
    setIsGenerating(true);
    try {
      const confirmed = window.confirm("This will clear your current plan and generate a 16-week progression. Continue?");
      if (!confirmed) return;

      await db.plannedWorkouts.clear();
      
      const plan: any[] = [];
      const lastWeekStart = startOfWeek(marathonDate, { weekStartsOn: 1 });
      
      for (let w = 0; w < 16; w++) {
        const weekStart = subWeeks(lastWeekStart, 15 - w);
        
        let longRunDist = 12 + (w * 2);
        if (w >= 13) longRunDist = 20 - (w - 13) * 5;
        if (w === 12) longRunDist = 32;

        const weekSchedule = [
          { type: 'rest', dist: 0 },
          { type: 'easy', dist: 8 + Math.floor(w/2) },
          { type: 'interval', dist: 10 + Math.floor(w/3) },
          { type: 'easy', dist: 8 + Math.floor(w/2) },
          { type: 'rest', dist: 0 },
          { type: 'long', dist: longRunDist },
          { type: 'recovery', dist: 5 + Math.floor(w/4) }
        ];

        weekSchedule.forEach((day, i) => {
          plan.push({
            id: crypto.randomUUID(),
            date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
            type: day.type,
            targetDistanceKm: day.dist,
            completedActivityId: null
          });
        });
      }

      plan.push({
        id: crypto.randomUUID(),
        date: format(marathonDate, 'yyyy-MM-dd'),
        type: 'race',
        targetDistanceKm: 42.2,
        completedActivityId: null
      });

      await db.plannedWorkouts.bulkAdd(plan);
    } finally {
      setIsGenerating(false);
    }
  };

  const linkActivity = async (workoutId: string, activityId: string) => {
    await db.plannedWorkouts.update(workoutId, { completedActivityId: activityId });
    setShowLinkModal(false);
    setSelectedWorkout(null);
  };

  const unlinkActivity = async (workoutId: string) => {
    await db.plannedWorkouts.update(workoutId, { completedActivityId: null });
  };

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekWorkouts = plannedWorkouts.filter(w => {
    const d = parseISO(w.date);
    return d >= currentWeekStart && d < addDays(currentWeekStart, 7);
  });

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 lg:pb-8">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-xl z-30 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Link to="/" className="lg:hidden p-2.5 bg-secondary hover:bg-card rounded-2xl transition-all">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-black text-2xl uppercase tracking-tighter">Training Plan</h1>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={generateBaselinePlan}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : '16-Week Plan'}
          </button>
          <button className="p-2.5 bg-secondary hover:bg-card rounded-2xl transition-all group">
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-8">
        <section className="bg-primary text-primary-foreground p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <CalendarIcon className="w-5 h-5 text-white/80" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Progressive Block</h2>
            </div>
            <div className="text-4xl font-black tracking-tighter uppercase leading-none">
              Marathon Prep
            </div>
            <div className="mt-6 flex gap-4">
               <div>
                  <div className="text-[10px] font-black uppercase opacity-60">Status</div>
                  <div className="text-lg font-black uppercase tracking-tight">Active Phase</div>
               </div>
               <div className="w-px h-10 bg-white/10" />
               <div>
                  <div className="text-[10px] font-black uppercase opacity-60">Marathon</div>
                  <div className="text-lg font-black uppercase tracking-tight">Jan 25, 2027</div>
               </div>
            </div>
          </div>
          <Trophy className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
        </section>

        <div className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-black text-xs uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Current Week
            </h3>
            <span className="text-[10px] font-black text-muted-foreground opacity-50 uppercase tracking-widest">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
            </span>
          </div>
          
          <div className="grid gap-4">
            {weekWorkouts.length === 0 ? (
               <div className="py-12 bg-card rounded-[32px] border border-dashed border-border text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">No workouts planned for this week</p>
                  <button onClick={generateBaselinePlan} className="mt-4 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto">
                    Generate Plan <ArrowRight className="w-3 h-3" />
                  </button>
               </div>
            ) : weekWorkouts.map((workout: any) => {
              const completedActivity = activities.find(a => a.id === workout.completedActivityId);
              
              return (
                <div 
                  key={workout.id} 
                  className="group relative overflow-hidden bg-card border border-border rounded-[32px] transition-all hover:border-primary/50 shadow-sm hover:shadow-xl"
                >
                  <div className="p-6 flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black transition-all shadow-sm ${
                      workout.completedActivityId ? 'bg-primary text-primary-foreground scale-95' : 'bg-secondary text-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      <span className="text-[9px] uppercase tracking-tighter">{format(parseISO(workout.date), 'EEE')}</span>
                      <span className="text-2xl tracking-tighter leading-none">{format(parseISO(workout.date), 'd')}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                            {workout.type} session
                            {workout.completedActivityId && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </h4>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                              <Zap className="w-3 h-3 text-primary opacity-50" />
                              {workout.targetDistanceKm || 0} km Target
                            </span>
                          </div>
                        </div>
                        {workout.completedActivityId ? (
                           <button onClick={() => unlinkActivity(workout.id)} className="p-2 text-muted-foreground hover:text-red-500">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        ) : (
                          <button onClick={() => { setSelectedWorkout(workout); setShowLinkModal(true); }} className="p-2 text-muted-foreground hover:text-primary">
                            <LinkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {completedActivity && (
                         <div className="mt-3 bg-secondary p-3 rounded-xl border border-border/50 text-[10px] font-black uppercase tracking-widest flex justify-between">
                           <span>Completed: {completedActivity.distanceKm} km</span>
                           <span className={workout.completedActivityId ? 'text-primary' : ''}>Link Validated</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
