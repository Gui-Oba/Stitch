import { DrawingGrid } from '@/components/DrawingGrid'
import { useModels } from '@/hooks/useModels'

export default function Test() {
  const { data: models, isLoading, isError, error } = useModels()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
        Loading your models...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm">
        {error.message}
      </div>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-gray-900">Test Your Models</h1>
          <p className="text-sm text-gray-600">
            Draw digits to test your trained models. The drawing will be converted to a 28x28 pixel image,
            similar to the MNIST dataset format.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr,auto]">
          <section className="rounded-xl border border-gray-200 bg-white p-8">
            <h2 className="text-xl font-semibold text-gray-900">Drawing Canvas</h2>
            <p className="mt-2 text-sm text-gray-600">
              Draw a digit (0-9) in the grid below. Your drawing will be processed in real-time.
            </p>
            <div className="mt-6 flex justify-center">
              <DrawingGrid
                onDrawingComplete={(pixels) => {
                  console.log('Drawing completed:', pixels)
                  // TODO: Add model inference logic here
                }}
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-8">
            <h2 className="text-xl font-semibold text-gray-900">Model Predictions</h2>
            <div className="mt-4">
              {models?.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No models available. Train a model in the Playground first.
                </p>
              ) : (
                <div className="space-y-4">
                  {models?.map((model) => (
                    <div
                      key={model.model_id}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Prediction: <span className="font-mono">waiting for input...</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}