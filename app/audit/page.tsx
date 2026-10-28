'use client';

import React, { useState } from 'react';
import { useCampusShare } from '@/components/CampusShareProvider';
import { 
  ShieldCheck, 
  Search, 
  Terminal, 
  Clock, 
  User, 
  FileCode, 
  Layers, 
  CheckCircle,
  Database,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';

export default function AuditLogPage() {
  const { auditLogs } = useCampusShare();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter((entry) => {
    const matchesFilter = filterAction === 'all' || entry.action.includes(filterAction);
    const matchesSearch =
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.target_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(entry.details).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('APPROVED')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300';
    }
    if (action.includes('REJECTED')) {
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300';
    }
    if (action.includes('WAITLISTED')) {
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300';
    }
    if (action.includes('REQUESTED')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300';
    }
    if (action.includes('INCIDENT')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300';
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `campus-share-audit-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Audit Compliance Trail (<code className="font-mono text-indigo-600 dark:text-indigo-400">audit_log</code>)
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Mandatory compliance log: All reservations, owner decisions with written reason, check-in inspections, and incidents are recorded.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export JSON Audit Trail</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Action Type Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: `All Events (${auditLogs.length})` },
            { id: 'BOOKING', label: 'Bookings' },
            { id: 'RESOURCE', label: 'Resources' },
            { id: 'CHECKED_IN', label: 'Check-Ins' },
            { id: 'RETURNED', label: 'Returns' },
            { id: 'INCIDENT', label: 'Incidents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterAction(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterAction === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Audit Entries List */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-500">
            No audit log entries matching your current filters.
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="p-4 sm:p-5 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getActionBadgeColor(entry.action)}`}>
                    {entry.action}
                  </span>
                  <span className="text-xs text-zinc-500">
                    on <code className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{entry.target_type}</code>
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    (id: {entry.target_id})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5" />
                  <FormattedDate date={entry.created_at} />
                </div>
              </div>

              {/* Actor details */}
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  Actor: <strong className="text-zinc-800 dark:text-zinc-200">{entry.actor_name}</strong>
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  {entry.actor_role}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  ({entry.actor_id})
                </span>
              </div>

              {/* JSON Metadata Payload */}
              <div className="mt-2 rounded-xl bg-zinc-950 text-zinc-200 p-3 font-mono text-[11px] overflow-x-auto border border-zinc-800 shadow-inner relative group">
                <div className="text-[10px] text-zinc-500 mb-1 flex items-center justify-between">
                  <span>METADATA PAYLOAD:</span>
                  <button
                    onClick={() => handleCopy(entry.id, JSON.stringify(entry.details, null, 2))}
                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedId === entry.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === entry.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400/90">
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
