import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Activity, 
  Calendar, 
  History, 
  Target,
  Trophy
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" },
      { title: "Marathon Prep" },
      { name: "description", content: "Personal running training for January 25, 2027" },
      { name: "author", content: "Marathon Prep" },
      { property: "og:title", content: "Marathon Prep" },
      { property: "og:description", content: "Clean, focused, private running training app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossOrigin: "",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(console.error);
            });
          }
        `}} />
        <div id="install-container" className="fixed bottom-24 right-6 z-50"></div>
        <script dangerouslySetInnerHTML={{__html: `
          let deferredPrompt;
          const container = document.getElementById('install-container');
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const btn = document.createElement('button');
            btn.className = 'bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-xl';
            btn.textContent = 'Install App';
            btn.onclick = () => {
              deferredPrompt.prompt();
              deferredPrompt = null;
              btn.remove();
            };
            container.appendChild(btn);
          });
        `}} />
      </body>
    </html>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center justify-center gap-1 transition-all ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className={`w-6 h-6 ${isActive ? 'fill-primary/10' : ''}`} />
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </Link>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col min-h-screen lg:flex-row bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border p-6 fixed h-full bg-card/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Trophy className="text-primary-foreground w-6 h-6" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase">Marathon Prep</span>
          </div>
          
          <nav className="flex-1 space-y-2">
            <DesktopNavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <DesktopNavItem to="/record" icon={Activity} label="Log & Track" />
            <DesktopNavItem to="/plan" icon={Calendar} label="Training Plan" />
            <DesktopNavItem to="/history" icon={History} label="History & Stats" />
            <DesktopNavItem to="/goals" icon={Target} label="Routes & Goals" />
          </nav>

        </aside>

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-64 relative min-h-screen">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 z-50">
          <NavItem to="/" icon={LayoutDashboard} label="Home" />
          <NavItem to="/record" icon={Activity} label="Track" />
          <NavItem to="/plan" icon={Calendar} label="Plan" />
          <NavItem to="/history" icon={History} label="History" />
          <NavItem to="/goals" icon={Target} label="Routes" />
        </nav>

      </div>
    </QueryClientProvider>
  );
}

function DesktopNavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
        isActive 
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
}
