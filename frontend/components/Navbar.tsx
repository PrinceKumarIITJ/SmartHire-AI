"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Briefcase, FileSearch, ShieldAlert, Cpu } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Jobs Dashboard", href: "/jobs", icon: Briefcase },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/jobs" className="flex items-center space-x-3 group">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              SmartHire <span className="gradient-text font-black">AI</span>
            </span>
            <span className="block text-xs text-gray-400 font-medium">
              Multi-Agent Recruitment Platform
            </span>
          </div>
        </Link>

        <nav className="flex items-center space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            7 Multi-Agents Active
          </span>
        </div>
      </div>
    </header>
  );
}
