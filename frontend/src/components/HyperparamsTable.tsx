import type { FC } from 'react'
import { memo } from 'react'

interface HyperparamsTableProps {
  hyperparams?: Record<string, unknown>
}

export const HyperparamsTable: FC<HyperparamsTableProps> = memo(({ hyperparams }) => {
  if (!hyperparams || Object.keys(hyperparams).length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No hyperparameters recorded.
      </div>
    )
  }

  const entries = Object.entries(hyperparams)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Parameter
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {entries.map(([key, value]) => (
            <tr key={key} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                {key}
              </td>
              <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                {typeof value === 'object' && value !== null
                  ? JSON.stringify(value)
                  : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

HyperparamsTable.displayName = 'HyperparamsTable'
