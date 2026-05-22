import os
import re

files = [
    "/Users/heaven/gmaps-lead-scraper/dashboard/src/pages/WhatsAppPage.tsx",
    "/Users/heaven/gmaps-lead-scraper/dashboard/src/pages/PipelinePage.tsx",
    "/Users/heaven/gmaps-lead-scraper/dashboard/src/pages/CampaignsPage.tsx",
    "/Users/heaven/gmaps-lead-scraper/dashboard/src/pages/SequencesPage.tsx",
]

replacements = [
    (r'bg-white/70 dark:bg-slate-900/40', 'bg-zinc-950/40'),
    (r'bg-white/80 dark:bg-slate-900/60', 'bg-zinc-950/60'),
    (r'bg-white dark:bg-slate-900/40', 'bg-zinc-950/40'),
    (r'bg-white dark:bg-slate-800/50', 'bg-zinc-950/50'),
    (r'bg-white dark:bg-slate-800', 'bg-zinc-950'),
    (r'bg-white', 'bg-zinc-950/40'),
    (r'border-slate-200/40 dark:border-slate-800/30', 'border-zinc-800/40'),
    (r'border-slate-200/60 dark:border-slate-800/40', 'border-zinc-800/40'),
    (r'border-slate-200/80 dark:border-slate-700', 'border-zinc-800/60'),
    (r'border-slate-100 dark:border-slate-800/50', 'border-zinc-800/50'),
    (r'border-slate-100 dark:border-slate-800', 'border-zinc-800/60'),
    (r'border-slate-200 dark:border-slate-800', 'border-zinc-800'),
    (r'border-slate-200', 'border-zinc-800'),
    (r'text-slate-800 dark:text-white', 'text-zinc-100'),
    (r'text-slate-900 dark:text-slate-100', 'text-zinc-100'),
    (r'text-slate-700 dark:text-slate-300', 'text-zinc-200'),
    (r'text-slate-600 dark:text-slate-300', 'text-zinc-300'),
    (r'text-slate-500 dark:text-slate-400', 'text-zinc-400'),
    (r'text-slate-400 dark:text-slate-500', 'text-zinc-500'),
    (r'text-slate-800', 'text-zinc-100'),
    (r'text-slate-600', 'text-zinc-300'),
    (r'dark:text-white', 'text-zinc-100'),
    (r'dark:bg-slate-900', 'bg-zinc-950'),
    (r'dark:bg-slate-800', 'bg-zinc-900'),
    (r'dark:bg-slate-800/50', 'bg-zinc-900/50'),
    (r'hover:bg-slate-50 dark:hover:bg-slate-800/50', 'hover:bg-zinc-900/50'),
    (r'hover:bg-slate-100 dark:hover:bg-slate-800', 'hover:bg-zinc-900/80'),
    (r'hover:bg-slate-100', 'hover:bg-zinc-900/50'),
    (r'bg-slate-50 dark:bg-slate-900/20', 'bg-zinc-950/20'),
    (r'bg-slate-50 dark:bg-slate-800/50', 'bg-zinc-900/50'),
    (r'bg-slate-100 dark:bg-slate-800', 'bg-zinc-900'),
    (r'bg-slate-100', 'bg-zinc-900'),
    (r'placeholder-slate-400/90', 'placeholder-zinc-500'),
    (r'placeholder-slate-400', 'placeholder-zinc-500'),
    (r'shadow-sm', 'shadow-xl'),
    (r'shadow-xs', 'shadow-lg'),
    (r'hover:text-slate-700 dark:hover:text-slate-200', 'hover:text-zinc-200'),
    (r'data-\[state=checked\]:bg-emerald-500 data-\[state=checked\]:border-emerald-500 border-slate-300 dark:border-slate-600', 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-zinc-700'),
    (r'divide-slate-200 dark:divide-slate-800/50', 'divide-zinc-800/50'),
    (r'bg-gradient-to-r from-emerald-50/80 via-emerald-50/30 to-slate-50/30 dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-slate-900/50', 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-zinc-900/50'),
]

for file_path in files:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        for old, new in replacements:
            content = re.sub(old, new, content)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"Skipped {file_path} (not found)")
