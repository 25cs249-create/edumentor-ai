import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-slate-900 transition-colors hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight font-bold">EduMentor AI</span>
        </Link>

        <nav className="flex items-center gap-6">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-400/20">
            Hackathon 2026
          </span>
        </nav>
      </div>
    </header>
  );
}
