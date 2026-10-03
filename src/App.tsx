import { useEffect, useState } from 'react'
import { contestName } from '../shared/text'
import { useContests } from './store'
import { Brief } from './views/Brief'
import { Home } from './views/Home'

/** Two screens, two hash routes: "#/" is home, "#/c/<id>" is a contest's brief. */
function useRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export function App() {
  const hash = useRoute()
  const contests = useContests()
  const id = /^#\/c\/([0-9a-f]+)$/.exec(hash)?.[1]

  const contest = id ? contests.find((c) => c.id === id) : undefined

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    document.title = contest ? `${contestName(contest.reading.contest)} · Ruleproof` : 'Ruleproof'
  }, [contest?.reading.contest])

  if (!id) return <Home />
  if (!contest) {
    return (
      <div className="home">
        <header className="masthead">
          <a className="wordmark link" href="#/">
            Ruleproof
          </a>
        </header>
        <p className="lost">
          This contest isn&rsquo;t saved in this browser. <a href="#/">Check a contest&rsquo;s rules</a>
        </p>
      </div>
    )
  }
  return <Brief contest={contest} />
}
