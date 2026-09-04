import Link from "next/link";
import { Sparkles, Globe, User } from "lucide-react";

interface AppHeaderProps {
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
}

export function AppHeader({ progress }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand logo & wordmark */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold text-slate-900 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 transition-transform group-hover:scale-105">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              EduMentor<span className="text-indigo-600"> AI</span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-slate-400">
              Personalized AI Teacher
            </span>
          </div>
        </Link>

        {/* Center: Optional Lesson Progress Indicator */}
        {progress && (
          <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-200/70 px-3.5 py-1.5 rounded-full">
            <span className="text-xs font-medium text-slate-600">
              {progress.label || `Section ${progress.current} of ${progress.total}`}
            </span>
            <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, (progress.current / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Right: Navigation & user utilities */}
        <div className="flex items-center gap-3">
          <Link
            href="/learn"
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded-md"
          >
            Learn
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/50">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>EN / HI</span>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
            <User className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>
    </header>
  );
}
