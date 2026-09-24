/**
 * Sur mobile, la table se transforme en liste de cartes verticales.
 * Sur desktop (≥ md), rendu tableau classique.
 */
export default function DataTable({ columns, rows, getRowKey, emptyMessage = 'Aucun résultat' }) {
  if (!rows?.length) {
    return (
      <div className="text-center py-10 text-sm text-[var(--c-text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Vue mobile : cartes empilées */}
      <ul className="md:hidden space-y-3">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-3 shadow-card"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between gap-3 py-1 text-sm">
                <span className="text-[var(--c-text-muted)]">{col.label}</span>
                <span className="text-right font-medium truncate">
                  {col.render ? col.render(row) : row[col.key]}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>

      {/* Vue desktop : tableau */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--c-border)]">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium text-[var(--c-text-muted)]">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b last:border-0 border-[var(--c-border)]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}