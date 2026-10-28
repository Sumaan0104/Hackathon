'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCampusShare } from '@/components/CampusShareProvider';
import { 
  Building2, 
  Lock, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  UserCheck, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { switchProfile } = useCampusShare();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleSignIn = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg(`Authenticated as ${targetEmail}!`);
      // Update context and redirect
      await switchProfile(targetEmail);
      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = (email: string) => {
    setEmail(email);
    setPassword('DemoPassword123!');
    handleSignIn(undefined, email, 'DemoPassword123!');
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-200">
      
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 mb-2">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          CampusShare Authentication
        </h1>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Connected to live Supabase Auth instance. All roles and access clearances are verified and enforced on the server.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl space-y-6">
        
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Standard Email / Password Form */}
        <form onSubmit={handleSignIn} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Campus Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user2@demo.com"
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-9 pr-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-9 pr-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating with Supabase...' : 'Sign In with Supabase Auth'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Real Live Demo Accounts with One-Click Access */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Live Seeded Test Personas (Real Supabase Auth)
            </span>
            <span className="text-[10px] text-zinc-400">Password: DemoPassword123!</span>
          </div>

          <div className="space-y-2">
            
            {/* user2@demo.com: The requested test persona without certs */}
            <button
              type="button"
              onClick={() => quickLoginAs('user2@demo.com')}
              className="w-full text-left p-3 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                    user2@demo.com
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                    No Certificates
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Jordan Lee (Freshman) &bull; Used for testing eligibility block on Photonics Lab
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                Sign In &rarr;
              </span>
            </button>

            {/* user1@demo.com: Certified user */}
            <button
              type="button"
              onClick={() => quickLoginAs('user1@demo.com')}
              className="w-full text-left p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    user1@demo.com
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Laser Tier-2 Certified
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Alex Rivera &bull; Student with verified laser & camera clearance
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                Sign In &rarr;
              </span>
            </button>

            {/* owner@demo.com */}
            <button
              type="button"
              onClick={() => quickLoginAs('owner@demo.com')}
              className="w-full text-left p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    owner@demo.com
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Owner Role
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Prof. Elena Vance &bull; Custodian of Photonics Lab & Cinema Rig
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                Sign In &rarr;
              </span>
            </button>

            {/* admin@demo.com */}
            <button
              type="button"
              onClick={() => quickLoginAs('admin@demo.com')}
              className="w-full text-left p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    admin@demo.com
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    Admin Role
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Dr. Sarah Chen &bull; Academic Dean with full system oversight
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                Sign In &rarr;
              </span>
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
