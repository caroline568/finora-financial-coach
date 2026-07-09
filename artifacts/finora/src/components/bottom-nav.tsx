import { useLocation } from "wouter";
import { Home, BarChart2, MessageCircle, Target, User } from "lucide-react";
import finoraLogo from "@/assets/finora-logo.png";

const GREEN = "#22c55e";

const NAV_ITEMS = [
  { path: "/dashboard", icon: Home,          label: "Home"    },
  { path: "/tracker",   icon: BarChart2,     label: "Tracker" },
  { path: "/chat",      icon: MessageCircle, label: "Coach",  special: true },
  { path: "/goals",     icon: Target,        label: "Goals"   },
  { path: "/profile",   icon: User,          label: "Me"      },
] as const;

export function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label, special }) => {
          const active = location === path || (path === "/chat" && location.startsWith("/chat"));
          return (
            <button
              key={path}
              onClick={() => setLocation(path)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 transition-all"
              aria-label={label}
            >
              {special ? (
                <div
                  style={{ backgroundColor: GREEN }}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 -mt-5"
                >
                  <img src={finoraLogo} alt="Coach" className="w-6 h-6 object-contain" />
                </div>
              ) : (
                <Icon
                  className="w-6 h-6 transition-colors"
                  style={{ color: active ? GREEN : "#9ca3af" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              )}
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? GREEN : "#9ca3af" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
