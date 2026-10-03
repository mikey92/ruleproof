import { useState } from 'react'
import type { Contest } from '../shared/types'
import { Brief } from './views/Brief'
import { Home } from './views/Home'

export function App() {
  const [contest, setContest] = useState<Contest | null>(null)
  return contest ? <Brief contest={contest} onHome={() => setContest(null)} /> : <Home onRead={setContest} />
}
