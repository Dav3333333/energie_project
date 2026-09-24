import { useMemo } from 'react';
import { formatDateTime } from '@/lib/formatters';

export default function AuditLogTable({ logs = [], pageSize = 20 }) {
  const rows = useMemo(() => logs.slice(0, pageSize), [logs, pageSize]);

  if (!rows.length) {
    return (
      <p className="text-sm text-[var(--c-text-muted)] py-6 text-center">
        Aucune activité.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((log) => (
        <li
          key={log.id}
          className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] p-3 text-sm"
        >
          <div className="flex justify-between gap-2">
            <span className="font-medium">{log.action}</span>
            <span className="text-xs text-[var(--c-text-muted)]">
              {formatDateTime(log.createdAt)}
            </span>
          </div>
          <p className="text-xs text-[var(--c-text-muted)] mt-1">
            {log.entityType} · {log.entityId}
            {log.actorRole ? ` · ${log.actorRole}` : ''}
          </p>
          {log.reason && <p className="text-xs mt-1">Motif : {log.reason}</p>}
        </li>
      ))}
    </ul>
  );
}