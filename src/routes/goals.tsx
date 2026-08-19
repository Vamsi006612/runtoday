import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { 
  ChevronLeft, 
  Save, 
  Trash2, 
  Map as MapIcon, 
  Activity, 
  TrendingUp,
  Mountain,
  Plus
} from "lucide-react";
import L from "leaflet";
import { db } from "@/lib/utils";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export const Route = createFileRoute("/goals")({
  component: RoutesAndGoals,
});

function RoutesAndGoals() {
  const [activeTab, setActiveTab] = useState<'goals' | 'routes'>('goals');
  
  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 lg:pb-8">
      <header className="p-6 flex flex-col gap-4 sticky top-0 bg-background/90 backdrop-blur-xl z-30 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-2xl uppercase tracking-tighter">Routes & Goals</h1>
        </div>

        <div className="flex bg-secondary/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'goals' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'routes' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Route Builder
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">
        {activeTab === 'goals' ? <GoalsView /> : <RouteBuilderView />}
      </main>
    </div>
  );
}

function GoalsView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30">
      <Activity className="w-12 h-12 mb-4" />
      <p className="font-black text-sm uppercase tracking-widest">Goal settings coming soon</p>
    </div>
  );
}

function RouteBuilderView() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [routeName, setRouteName] = useState("");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([51.505, -0.09], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);

      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
        setPoints(prev => [...prev, newPoint]);
      });
      
      polylineRef.current = L.polyline([], { color: '#f97316', weight: 4 }).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(points);
    }
  }, [points]);

  const handleSaveRoute = async () => {
    if (points.length < 2) return;
    const newRoute = {
      id: crypto.randomUUID(),
      name: routeName || "New Route",
      coordinates: points,
      distanceKm: 0, // Simplified
      elevationGain: 0,
      createdAt: new Date().toISOString()
    };
    await db.routes.add(newRoute);
    setPoints([]);
    setRouteName("");
    alert("Route saved!");
  };

  const elevationData = points.map((p, i) => ({
    dist: i,
    elev: Math.sin(i / 2) * 20 + 50 // Mock elevation
  }));

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-[32px] border border-border overflow-hidden h-[400px] relative">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
           <button onClick={() => setPoints([])} className="bg-background/80 backdrop-blur p-3 rounded-2xl border border-border shadow-lg">
             <Trash2 className="w-5 h-5 text-red-500" />
           </button>
        </div>
      </div>

      <div className="bg-card p-6 rounded-[32px] border border-border">
        <h3 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
          <Mountain className="w-4 h-4 text-orange-500" />
          Elevation Profile
        </h3>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={elevationData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <Tooltip content={({ active }) => null} />
              <Line type="monotone" dataKey="elev" stroke="#f97316" strokeWidth={2} dot={false} fill="rgba(249,115,22,0.1)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex gap-3">
        <input 
          type="text" 
          placeholder="Route Name" 
          className="flex-1 bg-secondary/50 border border-border rounded-2xl px-4 font-black uppercase text-xs"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
        />
        <button 
          onClick={handleSaveRoute}
          disabled={points.length < 2}
          className="bg-primary text-primary-foreground p-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save Route
        </button>
      </div>
    </div>
  );
}
