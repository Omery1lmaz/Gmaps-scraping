import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Eye, EyeOff, Check, ArrowRight, ShieldAlert, BarChart3, MessageSquare, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && !agreeTerms) {
      setError('Kullanım Koşullarını ve Gizlilik Politikasını onaylamalısınız.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        await register(fullName, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Giriş işlemi başarısız oldu. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-zinc-800', width: 'w-0' };
    if (pass.length < 6) return { score: 1, text: 'Zayıf', color: 'bg-red-500', width: 'w-1/3' };
    let score = 1;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score === 2) return { score: 2, text: 'Orta', color: 'bg-amber-500', width: 'w-2/3' };
    if (score >= 3) return { score: 3, text: 'Güçlü', color: 'bg-emerald-500', width: 'w-full' };
    return { score: 1, text: 'Zayıf', color: 'bg-red-500', width: 'w-1/3' };
  };

  const passwordStrength = getPasswordStrength(password);

  const steps = mode === 'login' ? [
    { id: 'step-1', num: 1, title: 'Kimlik Doğrulama', text: 'Hesap giriş bilgilerinizi güvenle girin.', active: true },
    { id: 'step-2', num: 2, title: 'WhatsApp Entegrasyonu', text: 'WhatsApp oturumunuzu bağlayıp aktif hale getirin.', active: false },
    { id: 'step-3', num: 3, title: 'Kontrol Paneline Erişim', text: 'Google Haritalar tarayıcısını ve akışları yönetin.', active: false },
  ] : [
    { id: 'step-1', num: 1, title: 'Kayıt Formunu Doldurun', text: 'B2B platformu için üyelik formunu saniyeler içinde tamamlayın.', active: true },
    { id: 'step-2', num: 2, title: 'Çalışma Alanınızı Kurun', text: 'Potansiyel müşteri listelerinizi ve şablonlarınızı özelleştirin.', active: false },
    { id: 'step-3', num: 3, title: 'Otomasyonu Başlatın', active: false, title2: 'İlk Kampanyanızı Başlatın', text: 'WhatsApp AI sekansları üzerinden otomatik ulaşımları tetikleyin.' },
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col select-none font-sans relative overflow-hidden">
      {/* Background Animated Gradient Blobs */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#030704,black)] pointer-events-none z-0" />
      
      <motion.div 
        animate={{ 
          x: [0, 30, -10, 0], 
          y: [0, -30, 20, 0] 
        }}
        transition={{ 
          duration: 18, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[10%] left-[15%] size-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, -20, 40, 0], 
          y: [0, 40, -30, 0] 
        }}
        transition={{ 
          duration: 22, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute bottom-[10%] right-[15%] size-[500px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Main Full-Screen Content Columns Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 relative z-10 w-full">
        
        {/* LEFT PANEL: Branding, Steps and Floating Dashboard Mockups */}
        <div className="lg:col-span-7 bg-gradient-to-tr from-black via-[#031c12] to-[#01261d] border-r border-zinc-900 p-8 lg:p-16 flex-col justify-between relative overflow-hidden hidden lg:flex select-none">
            {/* Spinning mesh glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,#10b98115_0%,transparent_60%)] pointer-events-none" />

            {/* Top Brand Info */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black font-black">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  WPAIFlow
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.5 rounded-full">AI</span>
                </span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9.5px] font-black text-emerald-400 uppercase tracking-widest">Sistem Aktif</span>
              </div>
            </div>

            {/* Middle Copywriting and Onboarding Timeline Cards */}
            <div className="space-y-8 my-auto z-10 max-w-lg">
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-white leading-[1.1] text-gradient-tw">
                  WhatsApp Ulaşımınızı Yapay Zeka ile Ölçekleyin
                </h1>
                <p className="text-[13px] font-medium text-white/60 leading-relaxed">
                  Google Haritalar'dan potansiyel müşterileri toplayın, yapay zeka ile kişiselleştirilmiş mesajlar hazırlayın ve otomatik WhatsApp kampanyalarını tek bir yerden yönetin.
                </p>
              </div>

              {/* Steps Onboarding Timeline */}
              <div className="space-y-4">
                {steps.map((step) => (
                  <motion.div
                    key={step.id}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "group flex items-start gap-4 p-4 rounded-2xl transition-all duration-500 relative overflow-hidden border",
                      step.active 
                        ? "bg-emerald-500/[0.08] border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    )}
                  >
                    {/* Active Step Glow */}
                    {step.active && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                    )}

                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border relative z-10 transition-all duration-500",
                      step.active 
                        ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                        : "bg-white/[0.05] border-white/10 text-white/40 group-hover:text-white/80 group-hover:bg-white/10"
                    )}>
                      {step.num}
                    </div>
                    <div className="space-y-1.5 text-left relative z-10 pt-0.5">
                      <h4 className={cn(
                        "text-[13px] font-black transition-colors duration-300", 
                        step.active ? "text-white" : "text-white/60 group-hover:text-white/90"
                      )}>
                        {step.title2 || step.title}
                      </h4>
                      <p className={cn(
                        "text-[11px] font-medium leading-relaxed transition-colors duration-300",
                        step.active ? "text-emerald-50/70" : "text-white/40 group-hover:text-white/60"
                      )}>
                        {step.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom Graphic Showcase Widgets */}
            <div className="relative h-28 z-10 overflow-visible mt-4">
              
              {/* Widget 1: Floating WhatsApp Dispatch bubble */}
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="bg-black/40 border border-white/10 backdrop-blur-xl p-4 rounded-2xl shadow-2xl flex items-start gap-3 w-72 absolute bottom-6 right-0"
              >
                <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0 border border-emerald-500/20">
                  WA
                </div>
                <div className="flex-1 space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white">Müşteri Bulundu</span>
                    <span className="text-[9px] font-bold text-white/40">Şimdi</span>
                  </div>
                  <p className="text-[10px] font-medium text-white/60 leading-tight">
                    "Central Dental Clinic" WhatsApp kuyruğuna alındı. AI şablonu yüklendi.
                  </p>
                </div>
              </motion.div>

              {/* Widget 2: Floating Lead Statistics */}
              <motion.div 
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="bg-black/40 border border-white/10 backdrop-blur-xl p-4.5 rounded-2xl shadow-2xl space-y-3 w-64 absolute bottom-6 -left-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Kampanya Verisi</span>
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">%98.4 İletim</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-black text-white">186 Leads</span>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                    12/dk
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[88%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* RIGHT PANEL: Pure Black/Dark-Gray Auth Form */}
          <div className="lg:col-span-5 h-full p-8 lg:p-12 flex flex-col justify-center bg-[#09090B] relative">
            <div className="w-full max-w-md mx-auto space-y-6">
              
              {/* Form Title */}
              <div className="space-y-1 text-left">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {mode === 'login' ? 'Hesaba Giriş Yap' : 'Hesap Oluşturun'}
                </h2>
                <p className="text-[11.5px] font-semibold text-slate-400">
                  {mode === 'login' 
                    ? 'WhatsApp potansiyel müşteri portalınıza erişmek için bilgilerinizi girin.' 
                    : 'Yapay zeka entegrasyonlu B2B lead ulaşımlarına bugün başlayın.'}
                </p>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  className="flex items-center justify-center gap-2 py-2.5 px-4 border border-white/5 hover:border-white/15 rounded-xl bg-[#121214] hover:bg-[#18181b] hover:border-slate-300 dark:border-zinc-700/80 text-[11px] font-black text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <svg className="size-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#ea4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.16-3.16C17.48 1.7 14.95 1 12 1 7.37 1 3.42 3.66 1.5 7.54l3.72 2.88c.87-2.6 3.3-4.38 6.78-4.38z" />
                    <path fill="#4285f4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.46h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.67 2.84c2.15-1.98 3.74-4.89 3.74-8.5z" />
                    <path fill="#fbbc05" d="M5.22 14.78a7.19 7.19 0 010-4.56L1.5 7.34a11.96 11.96 0 000 9.32l3.72-2.88z" />
                    <path fill="#34a853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.67-2.84c-1.01.68-2.3 1.08-4.29 1.08-3.48 0-5.91-1.78-6.78-4.38L1.5 16.82C3.42 20.7 7.37 23 12 23z" />
                  </svg>
                  <span>Google ile</span>
                </button>
                <button 
                  type="button" 
                  className="flex items-center justify-center gap-2 py-2.5 px-4 border border-white/5 hover:border-white/15 rounded-xl bg-[#121214] hover:bg-[#18181b] hover:border-slate-300 dark:border-zinc-700/80 text-[11px] font-black text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <svg className="size-3.5 shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                  </svg>
                  <span>Github ile</span>
                </button>
              </div>

              {/* Or separator */}
              <div className="flex items-center gap-3.5 text-[9.5px] font-black text-slate-500 tracking-wider">
                <div className="h-px bg-white/5 flex-1" />
                <span className="uppercase">veya e-posta ile</span>
                <div className="h-px bg-white/5 flex-1" />
              </div>

              {/* Credentials Form */}
              <form onSubmit={submit} className="space-y-4">
                
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest pl-1">Adı</label>
                      <Input 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Örn: John" 
                        className="h-11 rounded-xl bg-[#121214] border border-white/5 hover:border-white/15 text-xs font-semibold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600 transition-all" 
                        required
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest pl-1">Soyadı</label>
                      <Input 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        placeholder="Örn: Doe" 
                        className="h-11 rounded-xl bg-[#121214] border border-white/5 hover:border-white/15 text-xs font-semibold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600 transition-all" 
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <label className="text-[9.5px] font-black text-slate-455 uppercase tracking-widest pl-1">E-Posta Adresi</label>
                  <Input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="eg. johnfrans@gmail.com" 
                    type="email" 
                    className="h-11 rounded-xl bg-[#121214] border border-white/5 hover:border-white/15 text-xs font-semibold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600 transition-all" 
                    required 
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9.5px] font-black text-slate-455 uppercase tracking-widest">Şifre</label>
                    {mode === 'login' && (
                      <button type="button" className="text-[9px] font-bold text-emerald-400 hover:underline">
                        Şifremi Unuttum?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder={mode === 'login' ? '••••••••' : 'En az 6 karakter girin'} 
                      type={showPassword ? 'text' : 'password'} 
                      className="h-11 rounded-xl bg-[#121214] border border-white/5 hover:border-white/15 text-xs font-semibold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600 transition-all pr-10" 
                      required 
                      minLength={6} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator (Register Mode Only) */}
                  {mode === 'register' && password.length > 0 && (
                    <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-slate-400">Şifre Gücü:</span>
                        <span className={cn(
                          passwordStrength.score === 1 && "text-red-400",
                          passwordStrength.score === 2 && "text-amber-400",
                          passwordStrength.score === 3 && "text-emerald-400"
                        )}>
                          {passwordStrength.text}
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden w-full">
                        <div className={cn("h-full transition-all duration-300 rounded-full", passwordStrength.color, passwordStrength.width)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms of Service Checkbox */}
                {mode === 'register' && (
                  <div className="flex items-start gap-2.5 pt-1.5 select-none text-left">
                    <input 
                      type="checkbox"
                      id="agree"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="size-4 rounded border-white/5 bg-[#121214] text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 focus:ring-2 mt-0.5 cursor-pointer accent-emerald-500"
                    />
                    <label htmlFor="agree" className="text-[10px] font-semibold text-slate-450 leading-relaxed cursor-pointer">
                      <span className="text-slate-400">Kullanım Koşullarını</span> ve <span className="text-slate-400">Gizlilik Politikasını</span> kabul ediyorum.
                    </label>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="h-12 w-full rounded-xl bg-white hover:bg-slate-100 text-black font-extrabold shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer mt-4"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-black" />
                  ) : mode === 'login' ? (
                    'Giriş Yap'
                  ) : (
                    'Hesap Oluştur'
                  )}
                </Button>

                {/* Switch Mode Redirect */}
                <div className="text-center pt-2">
                  <span className="text-[11.5px] font-semibold text-slate-400">
                    {mode === 'login' ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login');
                        setError('');
                      }}
                      className="text-white hover:underline font-black transition-all cursor-pointer ml-1"
                    >
                      {mode === 'login' ? 'Kayıt olun' : 'Giriş yapın'}
                    </button>
                  </span>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
  );
}
