'use client';

import React, { useState } from 'react';
import { IncidentReport } from '@/lib/types';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ResolveIncidentModalProps {
  incident: IncidentReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitResolve: (incidentId: string, resolutionNotes: string) => Promise<void>;
}

export const ResolveIncidentModal: React.FC<ResolveIncidentModalProps> = ({
  incident,
  isOpen,
  onClose,
  onSubmitResolve,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState(
    'Inspected and resolved: System diagnostics recalibrated and verified safe for subsequent sessions.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const charCount = resolutionNotes.trim().length;
  const isValid = charCount >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes || resolutionNotes.trim().length < 10) {
      setErrorMsg('Mandatory Rule: Written resolution justification must be at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitResolve(incident.id, resolutionNotes.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve incident.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Custodian Incident Resolution
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5 line-clamp-1">
              Resolve Incident #{incident.id} ({incident.type.toUpperCase()})
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-xs text-red-700 border border-red-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Incident Context */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Reported by {incident.reporter_name}
              </span>
              <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">
                {incident.severity} severity
              </span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 italic text-xs">
              &ldquo;{incident.description}&rdquo;
            </p>
          </div>

          {/* No Automated Penalties Policy */}
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Campus Trust Governance Rule</strong>
              <div className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                Marking an incident resolved confirms corrective actions or inspection completion. Strictly no automated penalties or account deductions are levied.
              </div>
            </div>
          </div>

          {/* Resolution Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Resolution Explanation & Findings (min 10 chars)
              </label>
              <span className={`text-[11px] font-mono ${isValid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                {charCount} / 10 min
              </span>
            </div>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detail corrective actions taken (e.g. Laser power meter recalibrated, mirror optics realigned, zero permanent damage found)."
              required
              className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'Resolving...' : 'Authorize Incident Resolution'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
