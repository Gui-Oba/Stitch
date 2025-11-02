import type { FC } from 'react'
import { memo } from 'react'
import type { MnistSample } from '@/api/types'

interface SamplePredictionCardProps {
  sample: MnistSample
}

const renderSampleGrid = (grid: number[][]) => (
  <div
    className="grid"
    style={{
      gridTemplateColumns: 'repeat(28, 1fr)',
      gridAutoRows: '1fr',
      width: '112px',
      height: '112px',
      gap: '0',
    }}
  >
    {grid.map((row, rowIndex) =>
      row.map((value, columnIndex) => {
        const shade = Math.max(0, Math.min(255, value))
        return (
          <div
            key={`${rowIndex}-${columnIndex}`}
            style={{
              backgroundColor: `rgb(${shade}, ${shade}, ${shade})`,
              width: '100%',
              height: '100%',
            }}
          />
        )
      })
    )}
  </div>
)

export const SamplePredictionCard: FC<SamplePredictionCardProps> = memo(({ sample }) => {
  const isIncorrect = sample.prediction !== sample.label

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border p-3 shadow-sm transition-all ${
        isIncorrect
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {renderSampleGrid(sample.grid)}
      <div className="text-xs text-gray-700 text-center space-y-1">
        <div>
          <span className="font-semibold text-gray-900">True:</span> {sample.label}
        </div>
        <div className={isIncorrect ? 'text-red-700 font-semibold' : ''}>
          <span className="font-semibold text-gray-900">Pred:</span> {sample.prediction}
        </div>
        {typeof sample.confidence === 'number' && (
          <div>
            <span className="font-semibold text-gray-900">Confidence:</span>{' '}
            {(sample.confidence * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
})

SamplePredictionCard.displayName = 'SamplePredictionCard'
