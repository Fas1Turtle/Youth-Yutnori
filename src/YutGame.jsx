import { useEffect, useMemo, useState } from 'react'
import { Flag, Undo2, Users, Dices, SkipForward, CircleOff } from 'lucide-react'

const WAITING = -1
const START_FINISH_POS = 0
const DO_POS = 1
const OUT_POS = 30
const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b']
const TEAM_BG = ['bg-rose-500/15', 'bg-blue-500/15', 'bg-green-500/15', 'bg-amber-500/15']
const TEAM_TEXT = ['text-rose-300', 'text-blue-300', 'text-green-300', 'text-amber-300']

const OUTER_NODES = Array.from({ length: 20 }, (_, i) => i)
const DIAGONAL_NODES = Array.from({ length: 8 }, (_, i) => i + 20)
const CENTER_POS = 28
const BOARD_NODES = [...OUTER_NODES, ...DIAGONAL_NODES]

const nodeCoords = {
  0: [94, 94],
  1: [94, 78],
  2: [94, 62],
  3: [94, 46],
  4: [94, 30],
  5: [94, 14],
  6: [78, 14],
  7: [62, 14],
  8: [46, 14],
  9: [30, 14],
  10: [14, 14],
  11: [14, 30],
  12: [14, 46],
  13: [14, 62],
  14: [14, 78],
  15: [14, 94],
  16: [30, 94],
  17: [46, 94],
  18: [62, 94],
  19: [78, 94],
  20: [82, 26],
  21: [70, 38],
  22: [38, 70],
  23: [26, 82],
  24: [26, 26],
  25: [38, 38],
  26: [70, 70],
  27: [82, 82],
  28: [50, 50],
}

const outerLines = OUTER_NODES.map((p) => [p, p === 19 ? 0 : p + 1])
const diagonalLines = [
  [5, 20],
  [20, 21],
  [21, 28],
  [28, 22],
  [22, 23],
  [23, 15],
  [10, 24],
  [24, 25],
  [25, 28],
  [28, 26],
  [26, 27],
  [27, 0],
]

const moveDefs = [
  { label: '도', steps: 1, key: '1' },
  { label: '개', steps: 2, key: '2' },
  { label: '걸', steps: 3, key: '3' },
  { label: '윷', steps: 4, key: '4' },
  { label: '모', steps: 5, key: '5' },
  { label: '빽도', steps: -1, key: 'b' },
]

function YutGame() {
  const [settings, setSettings] = useState({
    numTeams: 2,
    numPieces: 4,
    mode: 'basic',
    teamNames: ['1팀', '2팀', '3팀', '4팀'],
  })
  const [started, setStarted] = useState(false)

  const [currentTeam, setCurrentTeam] = useState(0)
  const [pieces, setPieces] = useState([])
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [pendingMoves, setPendingMoves] = useState([])
  const [extraFromYutMoUsed, setExtraFromYutMoUsed] = useState(0)
  const [extraCaptureAvailable, setExtraCaptureAvailable] = useState(0)
  const [extraThrowsToUse, setExtraThrowsToUse] = useState(0)
  const [message, setMessage] = useState('게임을 시작하세요.')
  const [routeChoice, setRouteChoice] = useState(null)
  const [undoSnapshot, setUndoSnapshot] = useState(null)

  const yutMoLimit = settings.mode === 'basic' ? 1 : 3

  const activeTeamName = settings.teamNames[currentTeam]

  const pieceMap = useMemo(() => {
    const map = new Map()
    pieces.forEach((p) => map.set(p.id, p))
    return map
  }, [pieces])

  const piecesByTeam = useMemo(() => {
    return Array.from({ length: settings.numTeams }, (_, team) => pieces.filter((p) => p.team === team))
  }, [pieces, settings.numTeams])

  const countAtPos = (team, pos) => pieces.filter((p) => p.team === team && p.pos === pos).length

  const initGame = () => {
    const nextPieces = []
    for (let t = 0; t < settings.numTeams; t += 1) {
      for (let i = 0; i < settings.numPieces; i += 1) {
        nextPieces.push({ id: `${t}-${i}`, team: t, idx: i + 1, pos: WAITING, history: [] })
      }
    }
    setPieces(nextPieces)
    setCurrentTeam(0)
    setSelectedPieceId(null)
    setPendingMoves([])
    setExtraFromYutMoUsed(0)
    setExtraCaptureAvailable(0)
    setExtraThrowsToUse(0)
    setMessage('실물 윷을 던지고 결과를 입력하세요.')
    setRouteChoice(null)
    setUndoSnapshot(null)
    setStarted(true)
  }

  const nextPosFromOuter = (pos) => (pos === 19 ? 0 : pos + 1)

  const defaultNext = (pos) => {
    if (pos >= 0 && pos <= 19) return nextPosFromOuter(pos)
    if (pos === 20) return 21
    if (pos === 21) return 28
    if (pos === 22) return 23
    if (pos === 23) return 15
    if (pos === 24) return 25
    if (pos === 25) return 28
    if (pos === 26) return 27
    if (pos === 27) return 0
    if (pos === 28) return 22
    return OUT_POS
  }

  const nextWithChoice = (pos, choiceMap) => {
    if (pos === 5 && choiceMap?.from5) return choiceMap.from5 === 'diag' ? 20 : 6
    if (pos === 10 && choiceMap?.from10) return choiceMap.from10 === 'diag' ? 24 : 11
    if (pos === 28 && choiceMap?.from28) return choiceMap.from28 === 'toStart' ? 26 : 22
    return defaultNext(pos)
  }

  const teamFinished = (team) => pieces.filter((p) => p.team === team && p.pos === OUT_POS).length === settings.numPieces

  const moveToNextTeam = () => {
    let step = 1
    while (step <= settings.numTeams) {
      const team = (currentTeam + step) % settings.numTeams
      if (!teamFinished(team)) {
        setCurrentTeam(team)
        setSelectedPieceId(null)
        setPendingMoves([])
        setExtraFromYutMoUsed(0)
        setExtraCaptureAvailable(0)
        setExtraThrowsToUse(0)
        setUndoSnapshot(null)
        setMessage(`${settings.teamNames[team]} 차례입니다. 결과를 입력하세요.`)
        return
      }
      step += 1
    }
    setMessage('게임 종료! 모든 팀의 말이 OUT 처리되었습니다.')
  }

  const addMoveResult = (move) => {
    if (!started || routeChoice) return
    if (move.label === '낙') {
      setPendingMoves([])
      setExtraCaptureAvailable(0)
      setExtraThrowsToUse(0)
      setMessage('낙! 이번 차례는 즉시 종료됩니다.')
      moveToNextTeam()
      return
    }

    setPendingMoves((prev) => [...prev, { label: move.label, steps: move.steps, source: 'yut' }])

    if ((move.label === '윷' || move.label === '모') && extraFromYutMoUsed < yutMoLimit) {
      setExtraFromYutMoUsed((v) => v + 1)
      setExtraThrowsToUse((v) => v + 1)
      setMessage(`${move.label}! 추가 던지기 권리 +1`)
    } else {
      setMessage(`${move.label} 입력됨. 말을 선택 후 이동 실행하세요.`)
    }

    if (extraThrowsToUse > 0 && pendingMoves.length === 0) {
      setExtraThrowsToUse((v) => Math.max(0, v - 1))
    }
  }

  const resolveBackDoTarget = (piece) => {
    if (!piece) return null
    if (piece.pos === WAITING) return WAITING
    if (piece.pos === DO_POS) return START_FINISH_POS
    if (!piece.history || piece.history.length < 2) return WAITING
    return piece.history[piece.history.length - 2]
  }

  const applyMove = ({ chosenPath = null } = {}) => {
    if (!started || !pendingMoves.length) return
    const move = pendingMoves[0]
    const selected = pieceMap.get(selectedPieceId)
    if (!selected || selected.team !== currentTeam) {
      setMessage('현재 팀의 말을 먼저 선택하세요.')
      return
    }

    const movingIds =
      selected.pos >= 0 && selected.pos !== OUT_POS
        ? pieces.filter((p) => p.team === currentTeam && p.pos === selected.pos).map((p) => p.id)
        : [selected.id]

    if (move.steps < 0) {
      const target = resolveBackDoTarget(selected)
      if (target === WAITING && selected.pos === WAITING) {
        setMessage('대기칸의 말은 빽도로 이동할 수 없습니다.')
        return
      }

      const snapshot = {
        pieces: structuredClone(pieces),
        selectedPieceId,
        extraCaptureAvailable,
        extraThrowsToUse,
      }

      const opponentAtTarget = pieces.filter((p) => p.team !== currentTeam && p.pos === target)
      const capturedIds = opponentAtTarget.map((p) => p.id)
      const didCapture = capturedIds.length > 0

      const nextPieces = pieces.map((p) => {
        if (capturedIds.includes(p.id)) return { ...p, pos: WAITING, history: [] }
        if (movingIds.includes(p.id)) {
          const nextHistory = p.history ? [...p.history] : []
          if (target >= 0) nextHistory.push(target)
          return { ...p, pos: target, history: nextHistory }
        }
        return p
      })

      setUndoSnapshot(snapshot)
      setPieces(nextPieces)
      setPendingMoves((prev) => prev.slice(1))

      if (didCapture) {
        setExtraCaptureAvailable((v) => v + 1)
        setExtraThrowsToUse((v) => v + 1)
        setMessage('빽도로 잡기 성공! 추가 던지기 권리 +1')
      } else {
        setMessage('빽도 이동 완료.')
      }
      return
    }

    const startPos = selected.pos === WAITING ? START_FINISH_POS : selected.pos

    if ((startPos === 5 || startPos === 10 || startPos === 28) && !chosenPath) {
      const options =
        startPos === 5
          ? [
              { value: 'outer', label: '바깥길 유지' },
              { value: 'diag', label: '지름길 진입 (방 방향)' },
            ]
          : startPos === 10
            ? [
                { value: 'outer', label: '바깥길 유지' },
                { value: 'diag', label: '지름길 진입 (방 방향)' },
              ]
            : [
                { value: 'toBL', label: '좌하 방향으로 진행' },
                { value: 'toStart', label: '우하(참먹이) 방향으로 진행' },
              ]
      setRouteChoice({ move, pieceId: selected.id, startPos, options })
      return
    }

    const snapshot = {
      pieces: structuredClone(pieces),
      selectedPieceId,
      extraCaptureAvailable,
      extraThrowsToUse,
    }

    let cur = startPos
    let passedStart = false
    const choiceMap =
      startPos === 5
        ? { from5: chosenPath }
        : startPos === 10
          ? { from10: chosenPath }
          : startPos === 28
            ? { from28: chosenPath }
            : {}

    for (let i = 0; i < move.steps; i += 1) {
      const next = nextWithChoice(cur, choiceMap)
      if (cur !== START_FINISH_POS && next === START_FINISH_POS) passedStart = true
      cur = next
    }

    const targetPos = passedStart ? OUT_POS : cur

    const opponentOnTarget =
      targetPos >= 0 && targetPos !== OUT_POS
        ? pieces.filter((p) => p.team !== currentTeam && p.pos === targetPos)
        : []
    const capturedIds = opponentOnTarget.map((p) => p.id)
    const didCapture = capturedIds.length > 0

    const nextPieces = pieces.map((p) => {
      if (capturedIds.includes(p.id)) return { ...p, pos: WAITING, history: [] }
      if (movingIds.includes(p.id)) {
        const nextHistory = p.history ? [...p.history] : []
        if (targetPos >= 0 && targetPos !== OUT_POS) nextHistory.push(targetPos)
        return { ...p, pos: targetPos, history: nextHistory }
      }
      return p
    })

    setUndoSnapshot(snapshot)
    setPieces(nextPieces)
    setPendingMoves((prev) => prev.slice(1))
    setRouteChoice(null)

    if (didCapture) {
      setExtraCaptureAvailable((v) => v + 1)
      setExtraThrowsToUse((v) => v + 1)
      setMessage('잡기 성공! 추가 던지기 권리 +1')
    } else if (targetPos === OUT_POS) {
      setMessage('완전 골인! OUT 칸으로 이동했습니다.')
    } else {
      setMessage('이동 완료.')
    }
  }

  useEffect(() => {
    if (!started) return
    if (pendingMoves.length > 0 || routeChoice) return

    const allDone = piecesByTeam.every((list) => list.every((p) => p.pos === OUT_POS))
    if (allDone) {
      setMessage('게임 종료!')
      return
    }

    if (extraThrowsToUse > 0) {
      setMessage(`추가 던지기 권리 ${extraThrowsToUse}회 남음. 결과를 입력하세요.`)
      return
    }

    const id = setTimeout(() => {
      moveToNextTeam()
    }, 120)
    return () => clearTimeout(id)
  }, [started, pendingMoves, routeChoice, extraThrowsToUse, piecesByTeam])

  const undoLastMove = () => {
    if (!undoSnapshot) {
      setMessage('되돌릴 이동이 없습니다.')
      return
    }
    setPieces(undoSnapshot.pieces)
    setSelectedPieceId(undoSnapshot.selectedPieceId)
    setExtraCaptureAvailable(undoSnapshot.extraCaptureAvailable)
    setExtraThrowsToUse(undoSnapshot.extraThrowsToUse)
    setUndoSnapshot(null)
    setRouteChoice(null)
    setMessage('마지막 이동 1회를 되돌렸습니다. (던진 결과 복원 없음)')
  }

  useEffect(() => {
    const handle = (e) => {
      const key = e.key.toLowerCase()
      const found = moveDefs.find((m) => m.key === key)
      if (found) {
        e.preventDefault()
        addMoveResult(found)
        return
      }
      if (key === 'o') {
        e.preventDefault()
        addMoveResult({ label: '낙', steps: 0 })
        return
      }
      if (key === 'u') {
        e.preventDefault()
        undoLastMove()
        return
      }
      if (key === 'enter') {
        e.preventDefault()
        if (routeChoice) return
        applyMove()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  })

  const updateTeamName = (idx, value) => {
    setSettings((prev) => {
      const teamNames = [...prev.teamNames]
      teamNames[idx] = value
      return { ...prev, teamNames }
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Flag className="h-6 w-6 text-emerald-300" /> 실물 윷 입력 기반 윷놀이 진행 보드
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            단축키: 1/2/3/4/5, B(빽도), O(낙), U(Undo), Enter(이동 실행)
          </p>
        </header>

        {!started ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-cyan-300" /> 게임 설정
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-slate-300">팀 수</p>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSettings((p) => ({ ...p, numTeams: n }))}
                      className={`rounded-lg border px-3 py-1 ${
                        settings.numTeams === n ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-700'
                      }`}
                    >
                      {n}팀
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-300">팀당 말 수</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setSettings((p) => ({ ...p, numPieces: n }))}
                      className={`rounded-lg border px-3 py-1 ${
                        settings.numPieces === n ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-700'
                      }`}
                    >
                      {n}개
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-300">윷/모 추가기회 모드</p>
                <div className="flex gap-2">
                  {[
                    { value: 'basic', label: '기본(+1회)' },
                    { value: 'extended', label: '무제한 모드(턴당 최대 3회)' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setSettings((p) => ({ ...p, mode: m.value }))}
                      className={`rounded-lg border px-3 py-1 ${
                        settings.mode === m.value ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: settings.numTeams }, (_, i) => i).map((i) => (
                  <label key={i} className="space-y-1 text-sm">
                    <span className="text-slate-300">팀 {i + 1} 이름</span>
                    <input
                      value={settings.teamNames[i]}
                      onChange={(e) => updateTeamName(i, e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                    />
                  </label>
                ))}
              </div>

              <button
                onClick={initGame}
                className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900 hover:bg-emerald-400"
              >
                게임 시작
              </button>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <svg viewBox="0 0 108 108" className="mx-auto w-full max-w-[720px] rounded-xl bg-amber-950/30 p-3">
                {[...outerLines, ...diagonalLines].map(([a, b], idx) => (
                  <line
                    key={`${a}-${b}-${idx}`}
                    x1={nodeCoords[a][0]}
                    y1={nodeCoords[a][1]}
                    x2={nodeCoords[b][0]}
                    y2={nodeCoords[b][1]}
                    stroke="#a16207"
                    strokeWidth="1.4"
                  />
                ))}

                {BOARD_NODES.map((pos) => (
                  <g key={pos}>
                    <circle cx={nodeCoords[pos][0]} cy={nodeCoords[pos][1]} r="2.7" fill="#fef3c7" stroke="#a16207" />
                    <text x={nodeCoords[pos][0]} y={nodeCoords[pos][1] + 0.9} textAnchor="middle" className="fill-slate-900 text-[2.4px] font-bold">
                      {pos}
                    </text>
                  </g>
                ))}

                {pieces
                  .filter((p) => p.pos >= 0 && p.pos !== OUT_POS)
                  .map((p, idx) => {
                    const [x, y] = nodeCoords[p.pos]
                    const offset = ((idx % 4) - 1.5) * 1.8
                    return (
                      <circle
                        key={p.id}
                        cx={x + offset}
                        cy={y + (idx % 2 ? 1.3 : -1.3)}
                        r="1.7"
                        fill={TEAM_COLORS[p.team]}
                        stroke={selectedPieceId === p.id ? '#fff' : '#0f172a'}
                        strokeWidth={selectedPieceId === p.id ? '0.7' : '0.3'}
                      />
                    )
                  })}
              </svg>
            </div>

            <div className="space-y-3">
              <div className={`rounded-xl border border-slate-700 p-3 ${TEAM_BG[currentTeam]}`}>
                <p className="text-sm text-slate-300">현재 팀</p>
                <p className={`text-xl font-bold ${TEAM_TEXT[currentTeam]}`}>{activeTeamName}</p>
                <p className="mt-2 text-sm">{message}</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Dices className="h-4 w-4" /> 윷 결과 입력
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {moveDefs.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => addMoveResult(m)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm hover:border-cyan-400"
                    >
                      {m.label}
                    </button>
                  ))}
                  <button
                    onClick={() => addMoveResult({ label: '낙', steps: 0 })}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-2 text-sm"
                  >
                    낙
                  </button>
                </div>

                <div className="mt-3 rounded-lg bg-slate-950/70 p-2 text-xs text-slate-300">
                  대기 결과 큐: {pendingMoves.length ? pendingMoves.map((m, i) => <span key={`${m.label}-${i}`}>[{m.label}] </span>) : '없음'}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyMove()}
                    className="flex items-center justify-center gap-1 rounded-lg bg-cyan-500 px-2 py-2 text-sm font-semibold text-slate-900"
                  >
                    <SkipForward className="h-4 w-4" /> 이동 실행
                  </button>
                  <button
                    onClick={undoLastMove}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm"
                  >
                    <Undo2 className="h-4 w-4" /> Undo
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  잡기 추가기회: {extraCaptureAvailable} / 윷·모 사용: {extraFromYutMoUsed}/{yutMoLimit}
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                <p className="mb-2 text-sm font-semibold">대기칸 (출발 전)</p>
                <div className="space-y-2">
                  {piecesByTeam.map((teamPieces, team) => (
                    <div key={`w-${team}`}>
                      <p className={`text-xs ${TEAM_TEXT[team]}`}>{settings.teamNames[team]}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {teamPieces
                          .filter((p) => p.pos === WAITING)
                          .map((p) => {
                            const disabled = team !== currentTeam
                            return (
                              <button
                                key={p.id}
                                disabled={disabled}
                                onClick={() => setSelectedPieceId(p.id)}
                                className={`rounded px-2 py-1 text-xs ${
                                  selectedPieceId === p.id ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
                                } ${disabled ? 'opacity-40' : ''}`}
                              >
                                {settings.teamNames[team]}-{p.idx}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                <p className="mb-2 text-sm font-semibold">팀 현황 (보드/OUT)</p>
                <div className="space-y-2">
                  {piecesByTeam.map((teamPieces, team) => {
                    const outPieces = teamPieces.filter((p) => p.pos === OUT_POS)
                    return (
                      <div key={`s-${team}`} className="rounded-lg bg-slate-950/50 p-2 text-xs">
                        <p className={`${TEAM_TEXT[team]} font-semibold`}>{settings.teamNames[team]}</p>
                        <p>보드 말: {teamPieces.filter((p) => p.pos >= 0 && p.pos !== OUT_POS).length}</p>
                        <p>대기 말: {countAtPos(team, WAITING)}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <CircleOff className="h-3.5 w-3.5 text-slate-400" /> OUT ({outPieces.length})
                          {outPieces.map((p) => (
                            <span key={p.id} className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TEAM_COLORS[team] }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {routeChoice && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold">경로 선택</h3>
            <p className="mt-1 text-sm text-slate-300">선택한 말이 분기점에 있습니다. 다음 경로를 선택하세요.</p>
            <div className="mt-3 space-y-2">
              {routeChoice.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => applyMove({ chosenPath: opt.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm hover:border-cyan-400"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default YutGame
