"use client";

import * as React from "react";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Share2,
  Table2,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { cn } from "@/src/lib/utils";

export type AnalyticsNavId = "overview" | "trends" | "referrals" | "signups";

type Props = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  active: AnalyticsNavId;
  onNavigate: (id: AnalyticsNavId) => void;
};

const ITEMS: { id: AnalyticsNavId; label: string; icon: React.ElementType }[] =
  [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "trends", label: "Trends", icon: BarChart3 },
    { id: "referrals", label: "Referrals", icon: Share2 },
    { id: "signups", label: "Signups", icon: Table2 },
  ];

export function AnalyticsSidebar({
  collapsed,
  onCollapsedChange,
  active,
  onNavigate,
}: Props) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/90 transition-[width] duration-200 ease-out md:flex",
        collapsed ? "md:w-[72px]" : "md:w-56",
      )}
    >
      <div className="flex flex-1 flex-col gap-1 p-2 pt-4">
        <p
          className={cn(
            "px-2 pb-2 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase transition-opacity",
            collapsed && "pointer-events-none h-0 overflow-hidden p-0 opacity-0",
          )}
        >
          Analytics
        </p>
        <nav className="flex flex-col gap-0.5" aria-label="Analytics sections">
          {ITEMS.map(({ id, label, icon: Icon }) => {
            const selected = active === id;
            return (
              <Button
                key={id}
                type="button"
                variant={selected ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 w-full justify-start gap-2 px-2 font-normal",
                  collapsed && "justify-center px-0",
                )}
                onClick={() => onNavigate(id)}
                title={collapsed ? label : undefined}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                <span
                  className={cn(
                    "truncate transition-opacity",
                    collapsed && "sr-only",
                  )}
                >
                  {label}
                </span>
              </Button>
            );
          })}
        </nav>
      </div>

      <Separator className="bg-zinc-800" />

      <div className="p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="w-full"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
