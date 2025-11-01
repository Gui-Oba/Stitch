export default function Arena() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-gray-900">Arena</h1>
          <p className="text-sm text-gray-600">
            Coming soon: put your trained models head-to-head and benchmark their performance on curated challenges.
          </p>
        </header>

        <section className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-8 text-center shadow-sm">
          <p className="text-gray-600">
            We&apos;re still wiring up the Arena. Train a few models in the Build tab so you&apos;re ready when the brackets open!
          </p>
        </section>
      </div>
    </main>
  )
}
