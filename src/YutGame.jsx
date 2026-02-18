import { Gamepad2 } from 'lucide-react'

function YutGame() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <header className="mb-6 flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 backdrop-blur-sm">
          <Gamepad2 className="h-6 w-6 text-emerald-300" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight">Yutnori Board Ready</h1>
        </header>
        <p className="max-w-xl text-center text-base text-slate-200 sm:text-lg">
          This is a placeholder screen for the Youth Yutnori web app. Tailwind styles and
          lucide-react are wired up and ready for game logic implementation.
        </p>
      </div>
    </main>
  )
}

export default YutGame
