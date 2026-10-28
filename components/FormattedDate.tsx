'use client';

import React, { useState, useEffect } from 'react';

interface FormattedDateProps {
  date: string | null | undefined;
  type?: 'datetime' | 'date' | 'time';
}

export const FormattedDate: React.FC<FormattedDateProps> = ({ date, type = 'datetime' }) => {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (!date) return;
    try {
      const d = new Date(date);
      if (type === 'date') {
        setText(d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));
      } else if (type === 'time') {
        setText(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setText(d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }));
      }
    } catch {
      setText(date || '');
    }
  }, [date, type]);

  if (!date) return null;

  return <span suppressHydrationWarning>{text || date.split('T')[0]}</span>;
};
