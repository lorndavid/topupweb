/**
 * CSV Export utility
 * Converts an array of objects to a downloadable CSV file
 */

export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: { key: string; label: string }[]
): void {
  if (!rows.length) return

  // Build CSV header row
  const headers = columns.map((c) => `"${c.label}"`).join(',')

  // Build CSV data rows
  const dataRows = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key]
        // Handle null/undefined
        if (val === null || val === undefined) return '""'
        // Format numbers nicely
        if (typeof val === 'number') return val.toString()
        // Escape quotes in strings
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  const csv = [headers, ...dataRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
