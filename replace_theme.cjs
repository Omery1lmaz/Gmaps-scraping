const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dashboard', 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  {
    regex: /bg-white\/70 dark:bg-zinc-950\/40 bg-white\/80 dark:bg-zinc-950\/50 bg-white\/80 dark:bg-zinc-950\/50/g,
    replace: "bg-[#0c1220]/50 backdrop-blur-sm"
  },
  {
    regex: /bg-white\/70 dark:bg-zinc-950\/40 bg-white\/80 dark:bg-zinc-950\/50/g,
    replace: "bg-[#0c1220]/50 backdrop-blur-sm"
  },
  {
    regex: /bg-white\/70 dark:bg-zinc-950\/40 backdrop-blur-md/g,
    replace: "bg-[#0c1220]/50 backdrop-blur-sm"
  },
  {
    regex: /bg-white\/70 dark:bg-zinc-950\/40/g,
    replace: "bg-[#0c1220]/50 backdrop-blur-sm"
  },
  {
    regex: /border-slate-200\/50 dark:border-zinc-800\/40/g,
    replace: "border-white/5 hover:border-white/15"
  },
  {
    regex: /border border-slate-200 dark:border-zinc-800\/80/g,
    replace: "border border-white/5 hover:border-white/15"
  },
  {
    regex: /border-slate-200 dark:border-zinc-800 dark:border-slate-700/g,
    replace: "border-white/5"
  },
  {
    regex: /border-slate-200 dark:border-zinc-800/g,
    replace: "border-white/5"
  },
  {
    regex: /text-slate-700 dark:text-zinc-300/g,
    replace: "text-slate-100"
  },
  {
    regex: /text-slate-800 dark:text-zinc-200/g,
    replace: "text-slate-100"
  },
  {
    regex: /text-slate-500 dark:text-zinc-400/g,
    replace: "text-slate-400"
  },
  {
    regex: /text-slate-400 dark:text-zinc-500/g,
    replace: "text-slate-500"
  },
  {
    regex: /text-slate-900 dark:text-zinc-100/g,
    replace: "text-white"
  },
  {
    regex: /bg-slate-50 dark:bg-zinc-900\/50/g,
    replace: "bg-white/5"
  },
  {
    regex: /bg-slate-50 dark:bg-zinc-900/g,
    replace: "bg-white/5"
  },
  {
    regex: /shadow-sm dark:shadow-xl/g,
    replace: "shadow-xl"
  },
  {
    regex: /rounded-3xl/g,
    replace: "rounded-2xl"
  }
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
