import { describe, expect, it } from 'vitest'
import { contestName, tidyRules } from '../shared/text'
import { checkAll, indexText, locate } from '../shared/verify'

describe('tidyRules', () => {
  it('keeps at most one blank line and drops trailing spaces', () => {
    expect(tidyRules('  A  \r\n\r\n\r\n\r\nB\t\n\n\nC  ')).toBe('A\n\nB\n\nC')
  })
})

describe('contestName', () => {
  it('turns names set in capitals into title case, keeping short acronyms', () => {
    expect(contestName('BUILD WITH AI HACKATHON')).toBe('Build with AI Hackathon')
    expect(contestName('THE API CHALLENGE OF THE YEAR')).toBe('The API Challenge of the Year')
  })

  it('leaves names that already mix cases alone', () => {
    expect(contestName('IEEE ClimateChain Global Hackathon')).toBe('IEEE ClimateChain Global Hackathon')
    expect(contestName('  ')).toBe('Untitled contest')
  })
})

const RULES = `Submission Requirements

Include a demonstration video of your Project. The video portion of the Submission:
- should be less than three (3) minutes. Judges are not required to watch beyond three minutes
- must be uploaded to and made publicly visible on YouTube or Vimeo

The repository must be public and should be open source by including an open source license file. This license should be detectable and visible at the top of the repository page (in the About section).

Registration Period: September 22, 2026 (10:00 am Eastern Time) – October 26, 2026 (5:00 pm Eastern Time) (“Registration Period”).`

const ix = indexText(RULES)
const found = (quote: string) => {
  const s = locate(ix, quote)
  return s && RULES.slice(s.start, s.end)
}

describe('locate', () => {
  it('finds an exact quote and returns the original text span', () => {
    expect(found('Judges are not required to watch beyond three minutes')).toBe('Judges are not required to watch beyond three minutes')
  })

  it('ignores line breaks, repeated spaces and letter case', () => {
    const s = found('THE REPOSITORY MUST BE PUBLIC   and should be open source\nby including an open source license file.')
    expect(s).toBe('The repository must be public and should be open source by including an open source license file')
  })

  it('treats curly and straight quote marks, and dash styles, as the same', () => {
    expect(found('September 22, 2026 (10:00 am Eastern Time) - October 26, 2026 (5:00 pm Eastern Time) ("Registration Period")')).toContain(
      '– October 26, 2026 (5:00 pm Eastern Time) (“Registration Period',
    )
  })

  it('reads across list bullets', () => {
    const s = found('should be less than three (3) minutes. Judges are not required to watch beyond three minutes must be uploaded')
    expect(s).toContain('three minutes\n- must be uploaded')
  })

  it('accepts a quote with a trailing period the rules do not have', () => {
    expect(found('must be uploaded to and made publicly visible on YouTube or Vimeo.')).toBe(
      'must be uploaded to and made publicly visible on YouTube or Vimeo',
    )
  })

  it('accepts an ellipsis between parts that appear in order, close together', () => {
    const s = found('This license should be detectable ... (in the About section)')
    expect(s).toBe('This license should be detectable and visible at the top of the repository page (in the About section')
  })

  it('rejects parts that appear out of order', () => {
    expect(locate(ix, 'in the About section ... This license should be detectable')).toBeNull()
  })

  it('rejects a paraphrase', () => {
    expect(locate(ix, 'The video must be shorter than 3 minutes')).toBeNull()
    expect(locate(ix, 'Judges will not watch beyond three minutes')).toBeNull()
  })

  it('rejects quotes too short to prove anything', () => {
    expect(locate(ix, 'the video')).toBeNull()
  })
})

describe('checkAll', () => {
  it('marks each entry with its span or null', () => {
    const results = checkAll(ix, [
      { title: 'video', quote: 'should be less than three (3) minutes' },
      { title: 'made up', quote: 'Teams must have at least two members' },
    ])
    expect(results[0].span).not.toBeNull()
    expect(results[1].span).toBeNull()
    expect(results.map((r) => r.index)).toEqual([0, 1])
  })
})
