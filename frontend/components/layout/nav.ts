import { Activity, Bot, Briefcase, GitCompareArrows, LayoutDashboard, Mail, Settings, Users } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { label: "Copilot", href: "/copilot", icon: Bot, shortcut: "A", badge: "AI" },
  { label: "Jobs", href: "/jobs", icon: Briefcase, shortcut: "J" },
  { label: "Talent Pool", href: "/candidates", icon: Users, shortcut: "T" },
  { label: "Compare", href: "/compare", icon: GitCompareArrows, shortcut: "C" },
  { label: "Outbox", href: "/outbox", icon: Mail, shortcut: "O" },
  { label: "Agent Ops", href: "/agent-ops", icon: Activity, shortcut: "L" },
] as const;

export const SECONDARY_NAV = [
  { label: "Settings", href: "/settings", icon: Settings },
] as const;
