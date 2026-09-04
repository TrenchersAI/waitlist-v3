"use client";

import {
  Activity,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Coins,
  Scale,
  KeyRound,
  LayoutDashboard,
  Route,
  Share2,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Send,
  type LucideIcon,
  Handshake,
} from "lucide-react";

import { cn } from "@/src/lib/utils";

export type AnalyticsSection =
  | "dashboard"
  | "user-activity"
  | "pulse"
  | "referrals"
  | "top-referrers"
  | "users"
  | "survey"
  | "beta"
  | "falcon-claim"
  | "partners"
  | "bots"
  | "router-trades"
  | "volume"
  | "revenue"
  | "platform-accounting";

type ItemDef = {
  id: AnalyticsSection;
  label: string;
  icon: LucideIcon;
};

const ITEMS: ReadonlyArray<ItemDef> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "user-activity", label: "User activity", icon: UserCheck },
  { id: "pulse", label: "Live pulse", icon: Activity },
  { id: "bots", label: "Bots", icon: Bot },
  { id: "router-trades", label: "Router trades", icon: Route },
  { id: "volume", label: "Trading volume", icon: TrendingUp },
  { id: "revenue", label: "Trading revenue", icon: Coins },
  { id: "platform-accounting", label: "Platform accounting", icon: Scale },
  { id: "referrals", label: "Referrals", icon: Share2 },
  { id: "top-referrers", label: "Top referrers", icon: Trophy },
  { id: "users", label: "Users", icon: Users },
  { id: "survey", label: "Survey", icon: ClipboardList },
  { id: "beta", label: "Beta access", icon: KeyRound },
  { id: "falcon-claim", label: "Falcon claim", icon: Send },
  { id: "partners", label: "Partners", icon: Handshake },
];

type Props = {
  active: AnalyticsSection;
  onChange: (next: AnalyticsSection) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

/** Desktop sidebar rail. Width animates via inline `style` because Tailwind's
   JIT doesn't always pick up dynamically composed arbitrary class strings
   like `md:w-[64px]`. Mobile uses the separate `MobileBottomNav` below. */
export function AnalyticsSidebar({
  active,
  onChange,
  collapsed,
  onCollapsedChange,
}: Props) {
  return (
    <aside
      style={{
        width: collapsed ? 64 : 220,
        maxWidth: collapsed ? 64 : 220,
        flex: `0 0 ${collapsed ? 64 : 220}px`,
      }}
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] min-w-0 flex-col overflow-hidden border-r border-white/8 bg-black/40 transition-[max-width,width] duration-200 ease-out md:flex"
      aria-label="Analytics sections"
    >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav active={active} onChange={onChange} collapsed={collapsed} />
        <div className="mt-auto border-t border-white/5 p-2">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex w-full items-center justify-center rounded-md p-2 text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
          </button>
        </div>
    </aside>
  );
}

/** Bottom tab bar — native mobile pattern. Pinned to the bottom of the
   viewport, three equal-width tabs with icon + label, indigo accent stripe on
   the active tab. Hidden on md+. Respects the iOS home-indicator safe area. */
export function MobileBottomNav({
  active,
  onChange,
}: {
  active: AnalyticsSection;
  onChange: (next: AnalyticsSection) => void;
}) {
  return (
    <nav
      aria-label="Analytics sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Horizontal scroll, not a fixed grid: there are 10 sections and a
          `grid-cols-5` squashed every label past the fifth into an unreadable
          two-line wrap. Fixed-width items keep each tab legible and let the
          overflow scroll, which is the standard mobile tab-bar behaviour. */}
      <ul className="flex overflow-x-auto scrollbar-minimal-black">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <li key={id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-[72px] flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-white" : "text-white/55 hover:text-white/80",
                )}
              >
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white"
                  />
                ) : null}
                <Icon className="size-[18px] shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-12 shrink-0 items-center border-b border-white/5 px-3">
      {!collapsed ? (
        <p className="text-[10px] font-semibold tracking-[0.18em] text-white/40 uppercase">
          Analytics
        </p>
      ) : null}
    </div>
  );
}

function SidebarNav({
  active,
  onChange,
  collapsed,
}: {
  active: AnalyticsSection;
  onChange: (id: AnalyticsSection) => void;
  collapsed: boolean;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={collapsed ? label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2 text-sm font-medium transition-colors",
              collapsed && "justify-center",
              isActive
                ? "bg-white/[0.07] text-white"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                isActive ? "text-white" : "text-white/55",
              )}
              aria-hidden
            />
            {!collapsed ? (
              <span className="truncate">{label}</span>
            ) : (
              <span className="sr-only">{label}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
