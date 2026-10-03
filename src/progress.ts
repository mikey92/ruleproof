import type { Contest } from '../shared/types'
import { checkAll, indexText } from '../shared/verify'

export interface Progress {
  done: number
  total: number
  /** Indexes of items whose quote was found in the rules: the only ones that can be ticked */
  proven: Set<number>
}

const memo = new WeakMap<Contest['reading'], Set<number>>()

/** Ticked items over checkable items. Only items proven against the rules count. */
export function progress(contest: Contest): Progress {
  let proven = memo.get(contest.reading)
  if (!proven) {
    const ix = indexText(contest.text)
    proven = new Set(checkAll(ix, contest.reading.items).filter((c) => c.span).map((c) => c.index))
    memo.set(contest.reading, proven)
  }
  const done = contest.ticked.filter((i) => proven.has(i)).length
  return { done, total: proven.size, proven }
}
