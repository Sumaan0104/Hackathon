'use client';

import React from 'react';
import { X, ShieldCheck, Database, Lock, Scale, CheckCircle2, Server, Cpu } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                CampusShare Architecture & Governance Blueprint
              </h2>
              <p className="text-xs text-zinc-500">
                Senior engineering specification & security compliance model
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          
          {/* Security & Server Enforcement */}
          <div className="space-y-2">
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              <span>1. Zero-Trust Server-Side Role Enforcement</span>
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              All role validation and access gates execute strictly on the Next.js Server Actions layer and Supabase Row Level Security (RLS). Client components cannot bypass quota limits, approve their own reservations, or manipulate decision reasons.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block">role: user</span>
                <span className="text-zinc-500 text-[10px]">6h weekly cap, self-booking, check-in, reports.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-amber-600 dark:text-amber-400 block">role: owner</span>
                <span className="text-zinc-500 text-[10px]">List facilities, approve/reject/waitlist with written reason.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-blue-600 dark:text-blue-400 block">role: manager</span>
                <span className="text-zinc-500 text-[10px]">Cross-departmental space allocation & incident oversight.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-purple-600 dark:text-purple-400 block">role: admin</span>
                <span className="text-zinc-500 text-[10px]">Academic dean powers, policy configuration, audit trail.</span>
              </div>
            </div>
          </div>

          {/* Fair Access Waitlist Algorithm */}
          <div className="space-y-2">
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-600" />
              <span>2. Fair-Access Waitlist: Least-Recent-Use (LRU) Scheduling</span>
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Traditional first-come-first-served systems lead to resource monopolization by fast bots or senior labs. CampusShare ranks conflicted reservation requests using an equitable LRU priority formula:
            </p>
            <div className="p-3 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] border border-zinc-800">
              <code>PriorityScore = TimestampOfLastSessionCompletion(userId)</code>
              <div className="text-zinc-400 text-[10px] mt-1">
                // If user has never booked this resource: Score = 0 (Immediate #1 Priority Rank).
                <br />
                // Otherwise: Users who have waited longest since their previous checkout are sorted first.
              </div>
            </div>
          </div>

          {/* Audit Logging & Transparency */}
          <div className="space-y-2">
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span>3. Immutable Audit Log Architecture</span>
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every sensitive write operation triggers a transactional log entry containing:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
              <li><strong className="text-zinc-900 dark:text-zinc-200">Actor Context:</strong> User ID, Actor Name, Role stamp.</li>
              <li><strong className="text-zinc-900 dark:text-zinc-200">Action Name:</strong> e.g. <code className="font-mono text-indigo-600 dark:text-indigo-400">BOOKING_APPROVED</code>, <code className="font-mono text-indigo-600 dark:text-indigo-400">INCIDENT_REPORTED</code>.</li>
              <li><strong className="text-zinc-900 dark:text-zinc-200">Mandatory Justification:</strong> Reason text provided by owner.</li>
              <li><strong className="text-zinc-900 dark:text-zinc-200">Metadata Payload:</strong> Complete JSON snapshot of duration, pre-existing hours, condition notes.</li>
            </ul>
          </div>

          {/* Human in the loop Policy */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>4. Campus Governance: No Automated Penalties</span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
              Campus equipment and lab sessions naturally encounter unforeseen technical delays, alignment calibration, and accidental equipment wear. The platform strictly bars programmatic penalties, fines, or instant suspension. Owners and facility managers retain human-in-the-loop discretion.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
