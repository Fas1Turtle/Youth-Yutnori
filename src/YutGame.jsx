import { Gamepad2 } from 'lucide-react'

function YutGame() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <header className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-emerald-500/20 p-2 text-emerald-300">
            <Gamepad2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Yutnori Board Ready</h1>
        </header>

        <p className="mb-4 text-base text-slate-300 sm:text-lg">
          Youth Yutnori placeholder 화면입니다. Tailwind CSS 스타일과 lucide-react 아이콘이
          정상 연결된 상태이며, 다음 단계에서 게임 로직을 추가할 수 있습니다.
        </p>

        <div className="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-200">
          Placeholder UI Active
        </div>
      </div>
    </main>
  )
}

export default YutGame
