'use client';

import React from 'react';
import { Resource, Booking } from '@/lib/types';
import { X, Clock, UserCheck, ShieldAlert, Award } from 'lucide-react';

interface WaitlistQueueModalProps {
  resource: Resource | null;
  queue: Array<Booking & { lastUsedAt: string | null; priorityScore: number }>;
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistQueueModal: React.FC<WaitlistQueueModalProps> = ({
  resource,
  queue,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Fair-Access Waitlist Queue
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white line-clamp-1">
              {resource.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Explanation Banner */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <Award className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Rule: Waitlist ordered by least recent use.</strong>
              <div className="mt-0.5 text-[11px] text-indigo-800 dark:text-indigo-300">
                To guarantee equitable sharing across campus, researchers who have never used or least recently used this facility are given priority position in the queue.
              </div>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-xs">
              <Clock className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
              There are currently no users on the waitlist for this resource.
            </div>
          ) : (
            <div className="space-y-2.5">
              {queue.map((item, index) => {
                const isNeverUsed = !item.lastUsedAt;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">
                          {item.user_name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Requested: {new Date(item.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} ({item.duration_hours}h)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isNeverUsed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}>
                        {isNeverUsed ? '★ First Time User' : 'Least Recent'}
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {isNeverUsed ? 'Highest Priority' : `Last used: ${new Date(item.lastUsedAt!).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
