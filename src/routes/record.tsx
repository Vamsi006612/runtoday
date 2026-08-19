import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";

import { useEffect, useState, useRef } from "react";
import { 
  Timer, 
  Map as MapIcon, 
  ChevronLeft, 
  Play, 
  Square,
  Save,
  CheckCircle2,
  Zap,
  Clock,
  Navigation,
  MapPin
} from "lucide-react";
import { db, calculateDistance, formatDuration, calculatePace } from "@/lib/utils";
import L from "leaflet";


export const Route = createFileRoute("/record")({
  component: RecordRun,
  head: () => ({
    meta: [
      { title: "Marathon Prep | Record Run" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" }
    ],
  }),
});


function RecordRun() {
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    db.routes.toArray().then(setRoutes);
  }, []);

  const [isRecording, setIsRecording] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [notes, setNotes] = useState("");
  const [route, setRoute] = useState<[number, number][]>([]);
  const [perceivedEffort, setPerceivedEffort] = useState(5);
  const [currentPace, setCurrentPace] = useState("0:00");
  const [elevationGain, setElevationGain] = useState(0);
  const [title, setTitle] = useState("");

  
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const routeOverlayRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);

  const endMarkerRef = useRef<L.Marker | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Wake Lock API
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isRecording) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const name = err instanceof Error ? err.name : 'WakeLockError';
          console.error(`${name}, ${message}`);
        }
      }
    };

    if (isRecording) {
      requestWakeLock();
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [isRecording]);

  const mapInitialized = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && mapContainerRef.current && !mapInitialized.current) {
      mapInitialized.current = true;
      // Create map
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      }).setView([0, 0], 2);

      // Dark tiles for athletic look
      const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' });
      const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenTopoMap' });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' });

      baseLayer.addTo(map);

      L.control.layers({ "Dark": baseLayer, "Topo": topoLayer, "Satellite": satelliteLayer }).addTo(map);
      
      mapRef.current = map;
      
      polylineRef.current = L.polyline([], { 
        color: '#00ffff', // Neon Cyan
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeOverlayRef.current = L.polyline([], {
        color: '#ffffff',
        weight: 4,
        opacity: 0.3,
        dashArray: '10, 10'
      }).addTo(map);

      // Handle map resize
      const observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(mapContainerRef.current);

      return () => {
        observer.disconnect();
        map.remove();
        mapRef.current = null;
        mapInitialized.current = false;
      };
    }
    return undefined; // Ensure return value exists
  }, []);

  useEffect(() => {
    let watchId: number;
    if (isRecording) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Noise filter: drop points with accuracy > 20m
          if (position.coords.accuracy > 20) return;

          const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
          const altitude = position.coords.altitude;
          const speed = position.coords.speed; // speed in m/s

          // Filter unreasonable speed spikes (faster than 2:00/km = 8.33 m/s)
          if (speed && speed > 8.5) return;

          setRoute((prev) => {
            let nextDistance = 0;
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              if (last) {
                const d = calculateDistance(last[0], last[1], newPos[0], newPos[1]);
                
                // Reasonable threshold check
                if (d > 0.002) { // 2 meters
                  nextDistance = d;
                  setDistance((prevDist) => prevDist + d);
                  
                  // Track elevation gain
                  if (altitude !== null) {
                    // Simple elevation tracking
                  }
                }
              }
            } else {
              // Start point
              if (mapRef.current) {
                mapRef.current.setView(newPos, 16);
                
                const startIcon = L.divIcon({
                  html: '<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                  className: 'start-marker',
                  iconSize: [12, 12]
                });
                startMarkerRef.current = L.marker(newPos, { icon: startIcon }).addTo(mapRef.current);
              }
            }

            // Update current pace if speed is available
            if (speed && speed > 0.5) {
              const paceSecs = 1000 / speed;
              const mins = Math.floor(paceSecs / 60);
              const secs = Math.round(paceSecs % 60);
              setCurrentPace(`${mins}:${secs.toString().padStart(2, '0')}`);
            }

            const next = [...prev, newPos];
            if (polylineRef.current) polylineRef.current.setLatLngs(next);
            if (mapRef.current) mapRef.current.panTo(newPos);

            // Update end marker
            if (mapRef.current) {
              if (endMarkerRef.current) {
                endMarkerRef.current.setLatLng(newPos);
              } else {
                const endIcon = L.divIcon({
                  html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                  className: 'end-marker',
                  iconSize: [12, 12]
                });
                endMarkerRef.current = L.marker(newPos, { icon: endIcon }).addTo(mapRef.current);
              }
            }

            return next;
          });
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isRecording]);


  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      if (!startTime) {
        setStartTime(new Date());
        setTitle(`${format(new Date(), 'EEEE')} Morning Run`);
      }
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);


  const handleSave = async () => {
    const paceSeconds = distance > 0 ? seconds / distance : 0;
    const newActivity: any = {
      id: crypto.randomUUID(),
      distanceKm: parseFloat(distance.toFixed(2)),
      durationSeconds: seconds,
      date: startTime?.toISOString() || new Date().toISOString(),
      title: title || `${format(startTime || new Date(), 'EEEE')} Run`,
      type: 'easy',
      avgPaceSecondsPerKm: Math.round(paceSeconds),
      elevationGain: Math.round(elevationGain),
      perceivedEffort,
      notes,
      routeCoordinates: route,
      isGpsTracked: route.length > 0,
    };
    await db.activities.add(newActivity);
    setShowSummary(true);
  };


  if (showSummary) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center overflow-y-auto">
        <div className="w-20 h-20 bg-primary rounded-[24px] flex items-center justify-center mb-6 shadow-2xl shadow-primary/30 mt-8">
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">Workout Saved</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-8">Data synced to local IndexedDB</p>
        
        {/* Static Map View Placeholder */}
        <div className="w-full aspect-video bg-secondary rounded-[32px] border border-border mb-8 overflow-hidden relative">
           <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/pin-s+555555(0,0)/0,0,1/400x250')] bg-cover opacity-20 grayscale" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                 <MapIcon className="w-8 h-8 text-primary mx-auto mb-2 opacity-50" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route Summary Generated</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Distance</div>
            <div className="text-2xl font-black text-primary tracking-tighter">{(Number(distance) || 0).toFixed(2)} <span className="text-xs">km</span></div>
          </div>
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Time</div>
            <div className="text-2xl font-black text-foreground tracking-tighter tabular-nums">{formatDuration(seconds)}</div>
          </div>
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Avg Pace</div>
            <div className="text-2xl font-black text-foreground tracking-tighter tabular-nums">{calculatePace(distance, seconds)}</div>
          </div>
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Elev Gain</div>
            <div className="text-2xl font-black text-foreground tracking-tighter tabular-nums">{Math.round(elevationGain)} <span className="text-xs">m</span></div>
          </div>
        </div>

        <Link 
          to="/" 
          className="w-full max-w-sm bg-primary text-primary-foreground py-5 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50 bg-background z-30">
        <Link to="/" className="p-2.5 bg-secondary hover:bg-card rounded-2xl transition-all">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="text-center">
          <h1 className="font-black text-sm uppercase tracking-[0.2em]">Record Session</h1>
          {isRecording && (
            <div className="flex items-center gap-1.5 justify-center mt-0.5">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Live GPS Active</span>
            </div>
          )}
        </div>
        <div className="w-11" /> {/* Spacer */}
      </header>

      {/* Route Selector */}
      {!isRecording && seconds === 0 && routes.length > 0 && (
        <div className="px-6 py-3 bg-secondary/30 flex gap-2 overflow-x-auto no-scrollbar border-b border-border/50">
          <button 
            onClick={() => {
              setActiveRoute(null);
              if (routeOverlayRef.current) routeOverlayRef.current.setLatLngs([]);
            }}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${!activeRoute ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
          >
            Free Run
          </button>
          {routes.map(r => (
            <button 
              key={r.id}
              onClick={() => {
                setActiveRoute(r);
                if (routeOverlayRef.current) routeOverlayRef.current.setLatLngs(r.coordinates);
                if (mapRef.current) mapRef.current.fitBounds(r.coordinates);
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeRoute?.id === r.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
            >
              Follow: {r.name}
            </button>
          ))}
        </div>
      )}


      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden bg-secondary/20">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        
        {/* Reset View Button */}
        <button 
          onClick={() => {
            if (mapRef.current && route.length > 0) {
              mapRef.current.fitBounds(L.polyline(route).getBounds());
            }
          }}
          className="absolute bottom-6 right-6 z-40 bg-black/80 backdrop-blur p-3 rounded-full shadow-lg border border-white/10 text-white hover:bg-black/90 transition-all"
        >
          <Navigation className="w-5 h-5" />
        </button>

        {/* Loading/Error state placeholder logic could be added here */}
        <div className="absolute inset-0 z-10 hidden items-center justify-center bg-background/50 backdrop-blur-sm" id="map-status">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Loading Map...</p>
        </div>
        
        {/* Large Stats Display */}
        <div className="absolute top-6 left-6 right-6 z-20 space-y-3">
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-6 rounded-[32px] shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Time Elapsed</div>
                <div className="text-5xl font-black tracking-tighter text-white tabular-nums leading-none">
                  {formatDuration(seconds)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-cyan-400/70 uppercase font-black tracking-widest mb-1">Distance</div>
                <div className="text-5xl font-black tracking-tighter text-cyan-400 leading-none">
                  {(Number(distance) || 0).toFixed(2)} <span className="text-xl">km</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
              <div>
                <div className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Current Pace</div>
                <div className="text-3xl font-black tracking-tighter text-white tabular-nums">
                  {isRecording ? currentPace : "0:00"} <span className="text-xs opacity-50">/km</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Avg Pace</div>
                <div className="text-3xl font-black tracking-tighter text-white tabular-nums">
                  {calculatePace(distance, seconds)} <span className="text-xs opacity-50">/km</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 pb-10 bg-card border-t border-border rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] space-y-6 z-30">
        {!isRecording && seconds > 0 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Workout Title</label>
              <input 
                type="text"
                placeholder="Morning Run"
                className="w-full bg-secondary/50 border border-border rounded-2xl p-4 text-sm font-black uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between px-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Perceived Effort</label>
                <span className="text-[10px] font-black text-primary uppercase">{perceivedEffort}/10</span>
              </div>
              <input 
                type="range" min="1" max="10" 
                value={perceivedEffort} 
                onChange={(e) => setPerceivedEffort(parseInt(e.target.value))}
                className="w-full accent-primary h-2 bg-secondary rounded-full appearance-none cursor-pointer"
              />
            </div>
            <textarea 
              placeholder="Session notes (shoes, feeling, weather)..."
              className="w-full bg-secondary/50 border border-border rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all min-h-[90px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-4">
          {!isRecording && seconds === 0 ? (
            <button 
              onClick={() => setIsRecording(true)}
              className="flex-1 bg-cyan-500 text-black h-24 rounded-[32px] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
            >
              <Play className="w-10 h-10 fill-current group-hover:scale-110 transition-transform" />
              START RUN
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsRecording(!isRecording)}
                className={`flex-1 h-24 rounded-[32px] font-black text-xl flex items-center justify-center gap-3 transition-all ${
                  isRecording 
                    ? 'bg-secondary text-foreground border border-border active:scale-95 shadow-inner' 
                    : 'bg-cyan-500 text-black shadow-2xl shadow-cyan-500/20 active:scale-95'
                }`}
              >
                {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                {isRecording ? 'PAUSE' : 'RESUME'}
              </button>
              
              {!isRecording && (
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-white text-black h-24 rounded-[32px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Save className="w-8 h-8" />
                  FINISH
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
