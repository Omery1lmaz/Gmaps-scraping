import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '../components/ui/progress';
import {
  CreditCard,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Zap,
  Loader2,
  Calendar,
  Building,
  Award,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SubscriptionData {
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'canceled' | 'expired';
  subscriptionExpiresAt: string | null;
  leadsScrapedCount: number;
  leadsScrapedLimit: number;
  totalLeadsLimit: number;
}

export function BillingPage() {
  const { user, refreshUser } = useAuth();
  const t = useT();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise' | null>(null);

  // Credit Card Form States
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');

  const fetchSubscription = async (showGlow = false) => {
    if (showGlow) setRefetching(true);
    try {
      const res = await api.get('/subscription');
      setSubData(res.data);
    } catch (err: any) {
      toast.error(t('subscription_info_load_error'));
      console.error(err);
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleOpenPayment = (plan: 'starter' | 'pro' | 'enterprise') => {
    setSelectedPlan(plan);
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCvv('');
    setPaymentStep('form');
    setShowPaymentModal(true);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.length > 0 ? parts.join(' ') : '');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCardCvv(value.slice(0, 3));
  };

  const getCardType = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    if (cleanNum.startsWith('4')) return 'visa';
    if (cleanNum.startsWith('5')) return 'mastercard';
    return 'unknown';
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast.error(t('enter_valid_16_digit_card'));
      return;
    }
    if (cardExpiry.length < 5) {
      toast.error(t('enter_valid_expiry'));
      return;
    }
    if (cardCvv.length < 3) {
      toast.error(t('enter_valid_cvv'));
      return;
    }
    if (!cardHolder.trim()) {
      toast.error(t('enter_card_holder_name'));
      return;
    }

    setPaymentStep('processing');

    try {
      await api.post('/subscription/upgrade', { plan: selectedPlan });
      setPaymentStep('success');
      await refreshUser();
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('payment_verification_error'));
      setPaymentStep('form');
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm(t('cancel_subscription_confirm'))) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/subscription/cancel');
      toast.success(res.data.message || t('subscription_cancelled'));
      await refreshUser();
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('subscription_cancel_error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !subData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-emerald-500 size-10" />
          <p className="text-sm font-black text-slate-400">{t('billing_portal_loading')}</p>
        </div>
      </div>
    );
  }

  // Quota Calculations
  const leadsScraped = subData?.leadsScrapedCount || 0;
  const isStarter = subData?.plan === 'starter';
  const isPro = subData?.plan === 'pro';
  const isEnterprise = subData?.plan === 'enterprise';
  const isFree = subData?.plan === 'free' || !subData?.plan;

  const currentQuotaLimit = isFree ? 50 : isStarter ? 1000 : isPro ? 5000 : 25000;
  const quotaPercent = (leadsScraped / currentQuotaLimit) * 100;
  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative pb-10">
      {/* Dynamic Glow Accents */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[250px] h-[250px] bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              {t('billing_title')}
            </span>
            <Award size={20} className="text-emerald-400 animate-pulse" />
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            {t('billing_description')}
          </p>
        </div>
          <Button
          onClick={() => fetchSubscription(true)}
          variant="outline"
          size="sm"
          className="border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 backdrop-blur-md rounded-xl h-9"
          disabled={refetching}
        >
          <RefreshCw size={14} className={`mr-2 ${refetching ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Current Subscription Status & Quota Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Plan card */}
        <div className="lg:col-span-1 p-6 rounded-2xl border border-white/5 bg-[#0c1220]/50 backdrop-blur-md shadow-xl flex flex-col justify-between group hover:border-white/10 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('active_plan')}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                isStarter
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : isPro 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : isEnterprise
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}>
                {isStarter ? t('plan_starter') : isPro ? t('plan_pro') : isEnterprise ? t('plan_enterprise') : t('plan_free')}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <h3 className="text-3xl font-black text-white">
                {isStarter ? t('starter_package') : isPro ? t('pro_package') : isEnterprise ? t('enterprise_package') : t('starter_version')}
              </h3>
            </div>
            
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {isFree 
                ? t('plan_description_free') 
                : isStarter
                ? t('plan_description_starter')
                : isPro
                ? t('plan_description_pro')
                : t('plan_description_enterprise')}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
            {subData?.subscriptionExpiresAt && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold"><Calendar size={14} className="text-slate-500" /> {t('renewal_date')}</span>
                <span className="font-black text-slate-300">
                  {new Date(subData.subscriptionExpiresAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
            
            {!isFree && (
                <Button 
                  onClick={handleCancelSubscription}
                  variant="destructive" 
                  size="sm" 
                  className="w-full text-xs font-black uppercase tracking-wider h-8 rounded-xl"
                >
                  {t('cancel_subscription')}
                </Button>
            )}
          </div>
        </div>

        {/* Quota Progress */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-[#0c1220]/50 backdrop-blur-md shadow-xl flex flex-col justify-between group hover:border-white/10 transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500 to-indigo-500 opacity-[0.02] rounded-full blur-2xl pointer-events-none group-hover:opacity-[0.05] transition-opacity" />
          
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  {t('lead_storage_quota')}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t('stored_records_count')}</p>
              </div>
              <span className="text-xs font-black text-slate-300 tabular-nums">
                {leadsScraped.toLocaleString()} / {currentQuotaLimit.toLocaleString()} {t('leads')}
              </span>
            </div>

            <div className="mt-8 space-y-2">
              <Progress value={quotaPercent} className="h-2">
                <ProgressTrack className="bg-slate-800/80 rounded-full overflow-hidden h-2.5">
                  <ProgressIndicator className="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full h-full" style={{ width: `${Math.min(quotaPercent, 100)}%` }} />
                </ProgressTrack>
              </Progress>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2">
                <span>{t('quota_start')}</span>
                <span className={quotaPercent >= 80 ? 'text-rose-400 font-extrabold animate-pulse' : 'text-slate-400'}>
                  {t('quota_percent_full', quotaPercent.toFixed(0))}
                </span>
                <span>{t('quota_limit')}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-slate-400">
              {isFree 
                ? t('free_user_limits') 
                : isStarter
                ? t('starter_feature_limit')
                : isPro
                ? t('pro_unlimited_limits')
                : t('enterprise_feature_limit')}
            </p>
            {(isFree || isStarter || isPro) && (
              <Button 
                onClick={() => handleOpenPayment(isFree ? 'starter' : isStarter ? 'pro' : 'enterprise')}
                size="sm" 
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider h-8 rounded-xl shrink-0 group-hover:scale-105 transition-transform"
              >
                {t('increase_quota')}
                <ArrowRight size={12} className="ml-1" />
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Pricing Matrix */}
      <div className="space-y-6 relative z-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h3 className="text-2xl font-black text-slate-100">{t('choose_plan')}</h3>
          <p className="text-xs font-semibold text-slate-400">
            {t('choose_plan_desc')}
          </p>

          {/* Monthly / Yearly Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/5 mt-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('monthly_billing')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('yearly_billing')}
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold ${
                billingCycle === 'yearly' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
              }`}>
                {t('discount_20')}
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* FREE PLAN */}
          <div className="p-6 rounded-2xl border border-white/5 bg-[#0c1220]/50 backdrop-blur-md shadow-xl flex flex-col justify-between relative group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('plan_start')}</span>
                <h4 className="text-xl font-black text-slate-100 mt-1">{t('plan_free')}</h4>
                <p className="text-[11px] font-medium text-slate-400 mt-1.5">{t('plan_free_desc')}</p>
              </div>

              <div className="py-2">
                <span className="text-2xl font-black text-white">{t('free_price_full')}</span>
              </div>

              <hr className="border-white/5" />

              <ul className="space-y-2.5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('session_max_20_leads')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('cloud_max_100_leads')}</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <X size={14} className="text-rose-500/50 shrink-0" />
                  <span className="line-through">{t('whatsapp_automation')}</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <X size={14} className="text-rose-500/50 shrink-0" />
                  <span className="line-through">{t('ai_lead_analysis')}</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <X size={14} className="text-rose-500/50 shrink-0" />
                  <span className="line-through">{t('priority_api')}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 border-white/5 bg-white/5 cursor-default"
                disabled
              >
                {isFree ? t('currently_active') : t('starter_version')}
              </Button>
            </div>
          </div>

          {/* STARTER PLAN */}
          <div className="p-6 rounded-2xl border border-white/5 bg-[#0c1220]/50 backdrop-blur-md shadow-xl flex flex-col justify-between relative group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('plan_starter')}</span>
                <h4 className="text-xl font-black text-slate-100 mt-1">{t('starter_package_title')}</h4>
                <p className="text-[11px] font-medium text-slate-400 mt-1.5">{t('starter_package_desc')}</p>
              </div>

              <div className="py-2">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'yearly' ? t('starter_price_yearly') : t('starter_price_monthly')}
                </span>
                {billingCycle === 'yearly' && (
                  <div className="text-[9px] font-black text-blue-400 mt-1">
                    {t('starter_yearly_billing_note')}
                  </div>
                )}
              </div>

              <hr className="border-white/5" />

              <ul className="space-y-2.5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('starter_feature_limit')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('starter_feature_whatsapp')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('starter_feature_ai')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('starter_feature_cloud')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('starter_feature_support')}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              {isStarter ? (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-blue-400 border-blue-500/20 bg-blue-500/5 cursor-default"
                >
                  {t('currently_active')}
                </Button>
              ) : (
                <Button
                  onClick={() => handleOpenPayment('starter')}
                  className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-white border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  {t('upgrade_to_starter')}
                </Button>
              )}
            </div>
          </div>

          {/* GROWTH (PRO) PLAN */}
          <div className="p-6 rounded-2xl border-2 border-emerald-500 bg-[#0e172a]/60 backdrop-blur-md shadow-2xl flex flex-col justify-between relative group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[9px] font-black tracking-widest uppercase shadow-md flex items-center gap-1">
                <Sparkles size={10} />
                {t('most_popular')}
              </div>
            
            {/* Spotlight Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-400 opacity-[0.03] rounded-full blur-2xl pointer-events-none group-hover:opacity-[0.06] transition-opacity" />

            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap size={10} className="fill-emerald-400" />
                  {t('professional_label')}
                </span>
                <h4 className="text-xl font-black text-slate-100 mt-1">{t('pro_package_title')}</h4>
                <p className="text-[11px] font-medium text-slate-300 mt-1.5">{t('pro_package_desc')}</p>
              </div>

              <div className="py-2">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'yearly' ? t('pro_price_yearly') : t('pro_price_monthly')}
                </span>
                {billingCycle === 'yearly' && (
                  <div className="text-[9px] font-black text-emerald-400 mt-1">
                    {t('pro_yearly_billing_note')}
                  </div>
                )}
              </div>

              <hr className="border-white/10" />

              <ul className="space-y-2.5 text-[11px] text-slate-200 font-semibold">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
                  <span>{t('pro_feature_limit')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
                  <span>{t('pro_feature_whatsapp')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
                  <span>{t('pro_feature_sequences')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
                  <span>{t('pro_feature_ai')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.4)]" />
                  <span>{t('pro_feature_support')}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              {isPro ? (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-400 border-emerald-500/20 bg-emerald-500/5 cursor-default hover:bg-emerald-500/5 hover:text-emerald-400"
                >
                  {t('currently_active')}
                </Button>
              ) : (
                <Button
                  onClick={() => handleOpenPayment('pro')}
                  className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                >
                  {t('upgrade_to_pro')}
                </Button>
              )}
            </div>
          </div>

          {/* AGENCY (ENTERPRISE) PLAN */}
          <div className="p-6 rounded-2xl border border-white/5 bg-[#0c1220]/50 backdrop-blur-md shadow-xl flex flex-col justify-between relative group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-400 opacity-[0.02] rounded-full blur-2xl pointer-events-none group-hover:opacity-[0.05] transition-opacity" />

            <div className="space-y-5">
              <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    <Building size={10} />
                    {t('enterprise_label')}
                  </span>
                  <h4 className="text-xl font-black text-slate-100 mt-1">{t('enterprise_title')}</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5">{t('enterprise_desc')}</p>
              </div>

              <div className="py-2">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'yearly' ? t('enterprise_price_yearly') : t('enterprise_price_monthly')}
                </span>
                {billingCycle === 'yearly' && (
                  <div className="text-[9px] font-black text-indigo-400 mt-1">
                    {t('enterprise_yearly_billing_note')}
                  </div>
                )}
              </div>

              <hr className="border-white/5" />

              <ul className="space-y-2.5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>{t('enterprise_feature_limit')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>{t('enterprise_feature_whatsapp')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>{t('enterprise_feature_ai')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>{t('enterprise_feature_team')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>{t('enterprise_feature_support')}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              {isEnterprise ? (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-indigo-400 border-indigo-500/20 bg-indigo-500/5 cursor-default hover:bg-indigo-500/5 hover:text-indigo-400"
                >
                  {t('currently_active')}
                </Button>
              ) : (
                <Button
                  onClick={() => handleOpenPayment('enterprise')}
                  className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-white border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  {t('upgrade_to_enterprise')}
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Mock Billing History */}
      <div className="p-6 rounded-2xl border border-white/5 bg-[#0c1220]/50 backdrop-blur-md shadow-xl relative z-10 group hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
              <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-400" />
                {t('payment_history')}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t('payment_history_desc')}</p>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
              <tr>
                <th className="py-2.5">{t('invoice_no')}</th>
                <th className="py-2.5">{t('date')}</th>
                <th className="py-2.5">{t('amount')}</th>
                <th className="py-2.5">{t('method')}</th>
                <th className="py-2.5">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!isFree ? (
                <tr className="font-semibold text-slate-200">
                  <td className="py-3 text-[11px] font-bold text-slate-400">INV-2026-0428</td>
                  <td className="py-3">
                    {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                    <td className="py-3 text-emerald-400 font-extrabold">
                    {isStarter
                      ? (billingCycle === 'yearly' ? t('starter_invoice_yearly') : t('starter_invoice_monthly'))
                      : isPro 
                      ? (billingCycle === 'yearly' ? t('pro_invoice_yearly') : t('pro_invoice_monthly')) 
                      : (billingCycle === 'yearly' ? t('enterprise_invoice_yearly') : t('enterprise_invoice_monthly'))}
                  </td>
                  <td className="py-3 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-indigo-400" />
                    {t('credit_card_masked')}
                  </td>
                  <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                      {t('successful')}
                    </span>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    {t('no_invoices_yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Card Modal (Framer Motion Dialog Mockup) */}
      <AnimatePresence>
        {showPaymentModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => paymentStep !== 'processing' && setShowPaymentModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-3xl p-6 shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Close Button */}
              {paymentStep !== 'processing' && (
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20"
                >
                  <X size={16} />
                </button>
              )}

              {/* Form Step */}
              {paymentStep === 'form' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                      <CreditCard size={18} className="text-emerald-400" />
                        {t('secure_card_payment')}
                    </h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                        {selectedPlan === 'starter' ? t('starter_plan_membership') : selectedPlan === 'pro' ? t('pro_plan_membership') : t('enterprise_plan_membership')}
                      </p>
                  </div>

                  {/* 3D Animated Card Preview */}
                  <div className="relative h-44 w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden border border-white/10 group">
                    {/* Glowing card accents */}
                    <div className="absolute -top-10 -left-10 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-cyan-500/20 rounded-full blur-2xl" />

                    <div className="flex justify-between items-start relative z-10">
                      {/* Chip */}
                      <div className="w-10 h-7 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-md border border-yellow-700/50 shadow-inner" />
                      {/* Brand Logo */}
                      <div className="text-right text-xs font-black italic tracking-widest text-white/80">
                        {getCardType(cardNumber) === 'visa' && (
                          <span className="text-lg text-blue-300 font-extrabold uppercase">VISA</span>
                        )}
                        {getCardType(cardNumber) === 'mastercard' && (
                          <span className="text-lg text-rose-300 font-extrabold uppercase">MC</span>
                        )}
                        {getCardType(cardNumber) === 'unknown' && (
                          <span className="text-xs text-slate-400 font-black">SecureCard</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      {/* Card Number display */}
                      <div className="text-xl font-bold tracking-widest text-slate-100 font-mono text-center">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[8px] font-black text-slate-300/80 uppercase">{t('card_holder_label')}</div>
                              <div className="text-xs font-black text-white truncate max-w-[200px]">
                                {cardHolder.toUpperCase() || t('card_holder_placeholder')}
                              </div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <div className="text-[8px] font-black text-slate-300/80 uppercase">{t('expiry_label')}</div>
                            <div className="text-xs font-bold text-white font-mono">
                              {cardExpiry || 'AA/YY'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-slate-300/80 uppercase">{t('cvc_label')}</div>
                            <div className="text-xs font-bold text-white font-mono">
                              {cardCvv || '•••'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Inputs Form */}
                  <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">{t('card_holder_label')}</label>
                      <input
                        type="text"
                        placeholder={t('example_name')}
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs font-bold outline-none focus:border-emerald-500/50 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">{t('card_number_label')}</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={t('card_number_placeholder')}
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className="w-full h-10 pl-3 pr-10 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs font-bold outline-none focus:border-emerald-500/50 transition-colors font-mono"
                          required
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                          <CreditCard size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">{t('expiry_label')}</label>
                        <input
                          type="text"
                          placeholder={t('expiry_placeholder')}
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          className="w-full h-10 px-3 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs font-bold outline-none focus:border-emerald-500/50 transition-colors font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">{t('cvc_label')}</label>
                        <input
                          type="password"
                          placeholder={t('cvc_placeholder')}
                          value={cardCvv}
                          onChange={handleCvvChange}
                          className="w-full h-10 px-3 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs font-bold outline-none focus:border-emerald-500/50 transition-colors font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Secure badge */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center gap-2 text-slate-400">
                      <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                      <span className="text-[9px] font-bold">
                        {t('secure_payment_badge')}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                    >
                      {(() => {
                        const price = selectedPlan === 'starter'
                          ? (billingCycle === 'yearly' ? t('starter_price_yearly') : t('starter_price_monthly'))
                          : selectedPlan === 'pro'
                          ? (billingCycle === 'yearly' ? t('pro_price_yearly') : t('pro_price_monthly'))
                          : (billingCycle === 'yearly' ? t('enterprise_price_yearly') : t('enterprise_price_monthly'));
                        return t('pay_and_activate', { price });
                      })()}
                    </Button>
                  </form>
                </div>
              )}

              {/* Processing Spinner Step */}
              {paymentStep === 'processing' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="relative"
                  >
                    <Loader2 size={40} className="text-emerald-400" />
                    <div className="absolute inset-0 scale-125 bg-emerald-400/10 blur-xl rounded-full" />
                  </motion.div>

                  <div className="space-y-1.5">
                    <h4 className="text-sm font-black text-slate-100">{t('payment_verifying')}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t('payment_processing_msg')}
                      </p>
                  </div>
                </div>
              )}

              {/* Celebration Success Step */}
              {paymentStep === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                  {/* Glowing check circle */}
                  <div className="relative size-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                    >
                      <Check className="text-emerald-400 size-8 stroke-[3]" />
                    </motion.div>
                    
                    {/* Pure CSS/Framer Confetti Particles */}
                    <div className="absolute inset-0 overflow-visible pointer-events-none">
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                          animate={{
                            x: Math.cos((i * 30 * Math.PI) / 180) * (40 + Math.random() * 30),
                            y: Math.sin((i * 30 * Math.PI) / 180) * (40 + Math.random() * 30),
                            scale: [0.5, 1, 0],
                            opacity: [1, 1, 0]
                          }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                          className={`absolute top-1/2 left-1/2 size-2 rounded-full ${
                            i % 3 === 0 ? 'bg-emerald-400' : i % 3 === 1 ? 'bg-yellow-400' : 'bg-cyan-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-100">{t('payment_success_title')}</h4>
                    <p className="text-xs font-semibold text-slate-400">
                      {t('payment_success_msg', { plan: selectedPlan?.toUpperCase() })}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-2">
                      {t('unlimited_tools_activated')}
                    </p>
                  </div>

                  <Button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider h-10 rounded-xl"
                  >
                    {t('start_using')}
                  </Button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
