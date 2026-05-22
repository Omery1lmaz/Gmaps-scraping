import os
import re
import glob

# Hedef dosyalar: dashboard/src/pages/*.tsx
target_dir = "/Users/heaven/gmaps-lead-scraper/dashboard/src/pages"
files = glob.glob(os.path.join(target_dir, "*.tsx"))

replacements = [
    # Backgrounds
    (r'(?<!dark:)bg-zinc-950/40', r'bg-white/70 dark:bg-zinc-950/40'),
    (r'(?<!dark:)bg-zinc-950/50', r'bg-white/80 dark:bg-zinc-950/50'),
    (r'(?<!dark:)bg-zinc-950/60', r'bg-white/90 dark:bg-zinc-950/60'),
    (r'(?<!dark:)bg-zinc-950', r'bg-white dark:bg-zinc-950'),
    
    (r'(?<!dark:)bg-zinc-900/50', r'bg-slate-50 dark:bg-zinc-900/50'),
    (r'(?<!dark:)bg-zinc-900/60', r'bg-slate-100 dark:bg-zinc-900/60'),
    (r'(?<!dark:)bg-zinc-900/80', r'bg-slate-100/80 dark:bg-zinc-900/80'),
    (r'(?<!dark:)bg-zinc-900/30', r'bg-slate-50/50 dark:bg-zinc-900/30'),
    (r'(?<!dark:)bg-zinc-900', r'bg-slate-50 dark:bg-zinc-900'),

    # Borders
    (r'(?<!dark:)border-zinc-800/30', r'border-slate-200/40 dark:border-zinc-800/30'),
    (r'(?<!dark:)border-zinc-800/40', r'border-slate-200/50 dark:border-zinc-800/40'),
    (r'(?<!dark:)border-zinc-800/50', r'border-slate-200/60 dark:border-zinc-800/50'),
    (r'(?<!dark:)border-zinc-800/60', r'border-slate-200/80 dark:border-zinc-800/60'),
    (r'(?<!dark:)border-zinc-800', r'border-slate-200 dark:border-zinc-800'),

    (r'(?<!dark:)border-zinc-700/50', r'border-slate-300/50 dark:border-zinc-700/50'),
    (r'(?<!dark:)border-zinc-700', r'border-slate-300 dark:border-zinc-700'),

    # Typography
    (r'(?<!dark:)text-zinc-100', r'text-slate-900 dark:text-zinc-100'),
    (r'(?<!dark:)text-zinc-200', r'text-slate-800 dark:text-zinc-200'),
    (r'(?<!dark:)text-zinc-300', r'text-slate-700 dark:text-zinc-300'),
    (r'(?<!dark:)text-zinc-400', r'text-slate-500 dark:text-zinc-400'),
    (r'(?<!dark:)text-zinc-500', r'text-slate-400 dark:text-zinc-500'),
    (r'(?<!dark:)text-zinc-600', r'text-slate-300 dark:text-zinc-600'),
    
    # Text Gradients Fix (if applicable)
    (r'from-amber-400 via-emerald-400 to-emerald-600', r'from-emerald-500 to-emerald-700 dark:from-amber-400 dark:via-emerald-400 dark:to-emerald-600'),
    (r'from-emerald-500 to-emerald-600', r'from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600'),
    
    # Hover States
    (r'(?<!dark:)hover:bg-zinc-900/50', r'hover:bg-slate-100 dark:hover:bg-zinc-900/50'),
    (r'(?<!dark:)hover:bg-zinc-900/60', r'hover:bg-slate-100/60 dark:hover:bg-zinc-900/60'),
    (r'(?<!dark:)hover:bg-zinc-900/80', r'hover:bg-slate-200 dark:hover:bg-zinc-900/80'),
    (r'(?<!dark:)hover:bg-zinc-900', r'hover:bg-slate-100 dark:hover:bg-zinc-900'),
    (r'(?<!dark:)hover:bg-zinc-800/50', r'hover:bg-slate-200/50 dark:hover:bg-zinc-800/50'),
    
    # Divide
    (r'(?<!dark:)divide-zinc-800/40', r'divide-slate-200/50 dark:divide-zinc-800/40'),
    (r'(?<!dark:)divide-zinc-800/50', r'divide-slate-200/60 dark:divide-zinc-800/50'),
    (r'(?<!dark:)divide-zinc-800', r'divide-slate-200 dark:divide-zinc-800'),
    
    # Placeholders
    (r'(?<!dark:)placeholder-zinc-500', r'placeholder-slate-400 dark:placeholder-zinc-500'),
    
    # Specific shadows for light theme cards
    (r'(?<!dark:)shadow-xl', r'shadow-sm dark:shadow-xl'),
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched dual-theme support in: {os.path.basename(file_path)}")

print("All dual-theme mappings applied.")
