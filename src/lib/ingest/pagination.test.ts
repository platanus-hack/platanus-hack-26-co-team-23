import { describe, it, expect, vi, afterEach } from 'vitest'
import { corteConstitucional } from './sources/corte-constitucional'
import { sic } from './sources/sic'
import { legalize } from './sources/legalize'
import { superfinanciera } from './sources/superfinanciera'
import { dian } from './sources/dian'
import { croma } from './sources/croma'

/**
 * The pagination contract between ingestAll and the adapters.
 *
 * ingestAll walks pages until two of them carry the same ids, so an adapter that quietly
 * drops `offset` reports one page and the corpus flat-lines — that is exactly how the
 * pipeline sat at 115 norms while SUIN alone had 443 in force. These tests pin the two
 * legal behaviours: forward the offset, or say "I'm done" with an empty page.
 */

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
})

const mockFetch = (body: unknown) => {
  const spy = vi.fn().mockResolvedValue(ok(body))
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => vi.unstubAllGlobals())

describe('sources that paginate forward the offset', () => {
  it('corte-constitucional sends $offset to Socrata', async () => {
    const spy = mockFetch([])
    await corteConstitucional.fetch(25, 50)
    expect(spy.mock.calls[0][0]).toContain('$offset=50')
  })

  it('sic asks the Drupal listing for the matching page', async () => {
    const spy = mockFetch('<table></table>')
    await sic.fetch(10, 30)
    // offset 30 with a page size of 10 is the 4th page, and Drupal counts from 0.
    for (const [url] of spy.mock.calls) expect(url).toContain('page=3')
  })

  it('legalize maps the offset onto GitHub 1-based pages', async () => {
    const spy = mockFetch([])
    await legalize.fetch(15, 30)
    expect(spy.mock.calls[0][0]).toContain('page=3')
    // per_page must mirror `limit`: an over-fetch buffer plus a client-side trim would
    // leave the trimmed commits unreachable, since the next page resumes past them.
    expect(spy.mock.calls[0][0]).toContain('per_page=15')
  })
})

describe('bounded sources exhaust themselves on page 0', () => {
  // They return everything they have at once, so a second page would just re-download the
  // same documents for ingestAll to discard.
  it.each([
    ['superfinanciera', superfinanciera],
    ['dian', dian],
    ['croma', croma],
  ])('%s returns nothing past page 0 without hitting the network', async (_name, source) => {
    const spy = mockFetch([])
    await expect(source.fetch(15, 15)).resolves.toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})
