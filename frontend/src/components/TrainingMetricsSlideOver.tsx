import type { FC } from 'react'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'
import type { MetricData, MnistSample } from '@/api/types'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { SamplePredictionCard } from './SamplePredictionCard'
import { MetricCard } from './MetricCard'
import { MetricsCharts } from './MetricsCharts'

interface TrainingMetricsSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isTraining: boolean
  metrics: MetricData[]
  currentState: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | null
  runId?: string
  samplePredictions?: MnistSample[]
  onCancel?: () => void
  canCancel?: boolean
  isCancelling?: boolean
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

export const TrainingMetricsSlideOver: FC<TrainingMetricsSlideOverProps> = ({
  open,
  onOpenChange,
  isTraining,
  metrics,
  currentState,
  runId,
  samplePredictions = [],
  onCancel,
  canCancel = false,
  isCancelling = false,
}) => {
  const [modelName, setModelName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedModelId, setSavedModelId] = useState<string | null>(null)
  const hasSamplePredictions = samplePredictions.length > 0

  // Throttle metrics updates for performance
  const [throttledMetrics, setThrottledMetrics] = useState<MetricData[]>(metrics)
  const lastUpdateTime = useRef<number>(0)

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime.current

    // First metric or if 500ms has passed - update immediately
    if (metrics.length === 1 || timeSinceLastUpdate >= 500) {
      setThrottledMetrics(metrics)
      lastUpdateTime.current = now
    } else {
      // Otherwise, schedule an update for later
      const timer = setTimeout(() => {
        setThrottledMetrics(metrics)
        lastUpdateTime.current = Date.now()
      }, 500 - timeSinceLastUpdate)

      return () => clearTimeout(timer)
    }
  }, [metrics, metrics.length])

  const latestMetric = throttledMetrics.length > 0 ? throttledMetrics[throttledMetrics.length - 1] : null
  const previousMetric = throttledMetrics.length > 1 ? throttledMetrics[throttledMetrics.length - 2] : null

  // Calculate trends
  const trends = useMemo(() => {
    const latest = throttledMetrics.length > 0 ? throttledMetrics[throttledMetrics.length - 1] : null
    const previous = throttledMetrics.length > 1 ? throttledMetrics[throttledMetrics.length - 2] : null

    if (!latest || !previous) {
      return {
        trainLoss: 'neutral' as const,
        valLoss: 'neutral' as const,
        trainAcc: 'neutral' as const,
        valAcc: 'neutral' as const,
      }
    }

    return {
      trainLoss: latest.train_loss < previous.train_loss ? 'down' as const : latest.train_loss > previous.train_loss ? 'up' as const : 'neutral' as const,
      valLoss: latest.val_loss < previous.val_loss ? 'down' as const : latest.val_loss > previous.val_loss ? 'up' as const : 'neutral' as const,
      trainAcc: latest.train_accuracy > previous.train_accuracy ? 'up' as const : latest.train_accuracy < previous.train_accuracy ? 'down' as const : 'neutral' as const,
      valAcc: latest.val_accuracy > previous.val_accuracy ? 'up' as const : latest.val_accuracy < previous.val_accuracy ? 'down' as const : 'neutral' as const,
    }
  }, [throttledMetrics])

  // Detect overfitting
  const isOverfitting = useMemo(() => {
    const latest = throttledMetrics.length > 0 ? throttledMetrics[throttledMetrics.length - 1] : null
    if (!latest) return false
    const accuracyGap = latest.train_accuracy - latest.val_accuracy
    return accuracyGap > 0.1 // 10% threshold
  }, [throttledMetrics])

  const handleSaveModel = async () => {
    if (!runId || !modelName.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/models/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_id: runId,
          name: modelName.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedModelId(data.model_id)
        setModelName('')
      } else {
        const error = await response.json()
        alert(`Failed to save model: ${error.error}`)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      alert('Failed to save model')
    } finally {
      setIsSaving(false)
    }
  }

  const showCancelButton = Boolean(onCancel) && canCancel

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-3xl overflow-y-auto px-8 pb-8">
        <SheetHeader>
          <SheetTitle>Training Metrics</SheetTitle>
          <SheetDescription>
            {runId && <span className="text-xs font-mono">Run: {runId}</span>}
          </SheetDescription>
        </SheetHeader>

        {/* Save Model Section - Show when training succeeded */}
        {currentState === 'succeeded' && !savedModelId && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold text-green-900">Save Model</h3>
            <p className="text-xs text-green-700">
              Training completed successfully! Save this model to use it later.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Model name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSaveModel}
                disabled={!modelName.trim() || isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {savedModelId && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold text-green-900">Model Saved!</h3>
            <p className="text-xs text-green-700 mt-1">
              Model ID: <span className="font-mono">{savedModelId}</span>
            </p>
            <a
              href={`/models/${savedModelId}`}
              className="text-xs text-green-600 hover:underline mt-2 inline-block"
            >
              View model →
            </a>
          </div>
        )}


        <div className="mt-2 space-y-6">
          {latestMetric && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Latest Metrics</h3>
                {isOverfitting && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 rounded text-xs text-amber-700">
                    <span>⚠️</span>
                    <span className="font-semibold">Potential overfitting</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <MetricCard
                  label="Train Loss"
                  value={latestMetric.train_loss}
                  colorClass="text-red-700"
                  bgColorClass="bg-red-50"
                  trend={trends.trainLoss}
                />
                <MetricCard
                  label="Val Loss"
                  value={latestMetric.val_loss}
                  colorClass="text-blue-700"
                  bgColorClass="bg-blue-50"
                  trend={trends.valLoss}
                />
                <MetricCard
                  label="Train Acc"
                  value={latestMetric.train_accuracy}
                  format="percentage"
                  colorClass="text-green-700"
                  bgColorClass="bg-green-50"
                  trend={trends.trainAcc}
                />
                <MetricCard
                  label="Val Acc"
                  value={latestMetric.val_accuracy}
                  format="percentage"
                  colorClass="text-purple-700"
                  bgColorClass="bg-purple-50"
                  trend={trends.valAcc}
                />
              </div>
            </div>
          )}

          {/* Status & Progress - Consolidated */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Status</h3>
              <div className="flex items-center gap-2">
                {isTraining && (
                  <svg
                    className="w-4 h-4 animate-spin text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm font-medium ${currentState === 'running'
                    ? 'text-blue-600'
                    : currentState === 'succeeded'
                      ? 'text-green-600'
                      : currentState === 'failed'
                        ? 'text-red-600'
                        : currentState === 'cancelled'
                          ? 'text-gray-600'
                          : 'text-gray-600'
                    }`}
                >
                  {currentState === 'running'
                    ? 'Training...'
                    : currentState === 'succeeded'
                      ? 'Completed'
                      : currentState === 'failed'
                        ? 'Failed'
                        : currentState === 'cancelled'
                          ? 'Cancelled'
                          : currentState === 'queued'
                            ? 'Queued'
                            : 'Idle'}
                </span>
              </div>
            </div>

            {latestMetric && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-600">
                      Epoch {latestMetric.epoch}
                      {latestMetric.progress !== undefined &&
                        ` (${(latestMetric.progress * 100).toFixed(0)}%)`}
                    </span>
                  </div>
                  {latestMetric.progress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${latestMetric.progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {latestMetric.eta_seconds !== undefined && latestMetric.eta_seconds > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estimated Time Remaining</span>
                    <span className="font-mono text-gray-900">
                      {formatTime(latestMetric.eta_seconds)}
                    </span>
                  </div>
                )}
              </>
            )}

            {showCancelButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel training'}
              </Button>
            )}
          </div>

          {/* Charts */}
          <MetricsCharts metrics={throttledMetrics} />

          {/* Sample Predictions */}
          {hasSamplePredictions && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Sample Predictions</h3>
              <p className="text-xs text-gray-500">
                Eight validation samples, their true labels, and the model&apos;s predictions. <span className="text-red-600">Red highlights</span> indicate incorrect predictions.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {samplePredictions.slice(0, 8).map((sample, index) => (
                  <SamplePredictionCard
                    key={`${sample.label}-${sample.prediction}-${index}`}
                    sample={sample}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Training Info */}
          {latestMetric && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Training Info</h3>
              <div className="space-y-1 text-sm">
                {latestMetric.learning_rate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Learning Rate:</span>
                    <span className="font-mono text-gray-900">
                      {latestMetric.learning_rate.toFixed(6)}
                    </span>
                  </div>
                )}
                {latestMetric.epoch_time !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Epoch Time:</span>
                    <span className="font-mono text-gray-900">
                      {latestMetric.epoch_time.toFixed(2)}s
                    </span>
                  </div>
                )}
                {latestMetric.samples_per_sec !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Samples/sec:</span>
                    <span className="font-mono text-gray-900">
                      {latestMetric.samples_per_sec.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metrics History */}
          {throttledMetrics.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">History</h3>
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Epoch</th>
                      <th className="px-2 py-1 text-right">Train Loss</th>
                      <th className="px-2 py-1 text-right">Val Loss</th>
                      <th className="px-2 py-1 text-right">Val Acc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {throttledMetrics
                      .slice()
                      .reverse()
                      .map((metric, idx) => (
                        <tr
                          key={idx}
                          className={idx === 0 ? 'bg-blue-50 font-semibold' : ''}
                        >
                          <td className="px-2 py-1">{metric.epoch}</td>
                          <td className="px-2 py-1 text-right font-mono">
                            {metric.train_loss.toFixed(4)}
                          </td>
                          <td className="px-2 py-1 text-right font-mono">
                            {metric.val_loss.toFixed(4)}
                          </td>
                          <td className="px-2 py-1 text-right font-mono">
                            {(metric.val_accuracy * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isTraining && metrics.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <svg
                className="w-12 h-12 animate-spin text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm text-gray-600">Initializing training...</p>
            </div>
          )}

          {/* Empty State */}
          {!isTraining && metrics.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-gray-600">
                No training metrics yet. Start a training run to see live updates here.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
