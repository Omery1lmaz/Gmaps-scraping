import { 
  LayoutDashboard, 
  Users, 
  Layout, 
  BarChart3, 
  Zap,
  MessageCircle,
  FileText,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLocation, Link } from '../../lib/router';

const menuItems = [
  { id: 'overview', path: '/overview', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'leads', path: '/leads', icon: Users, label: 'Leads' },
  { id: 'pipeline', path: '/pipeline', icon: Layout, label: 'Pipeline' },
  { id: 'templates', path: '/templates', icon: FileText, label: 'WP Şablonlar' },
  { id: 'sequences', path: '/sequences', icon: Zap, label: 'WP Otomasyon' },
  { id: 'whatsapp', path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp Web' },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-64 border-r border-border bg-white flex flex-col h-screen shrink-0">
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className="bg-blue-600 size-8 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <LayoutDashboard size={20} />
        </div>
        <span className="font-black text-lg tracking-tight text-slate-800">LeadSystem <span className="text-blue-600 text-[10px] align-top ml-1">PRO</span></span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (pathname === '/' && item.path === '/leads');
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={cn(isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="text-sm font-bold">{item.label}</span>
              </div>
              {isActive && <div className="size-1.5 rounded-full bg-blue-600" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-50">
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
          <div className="flex items-center gap-3">
            <img src="https://github.com/shadcn.png" className="size-10 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-800 truncate">Heaven Admin</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">Kurucu Ortak</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
