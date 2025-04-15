import { writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import seenIds from '~/assets/apple-seen-ids.json'
import { apple } from '~/assets/config.json'
import { name } from '~/package.json'
import type { Job } from '#apple/types'
import { checkKeywords, fetchHtmlDocument } from '#apple/util'
import { webhookClient } from '#webhook'

const seenIdsSet = new Set<number>(seenIds)
const updatedSeenIdsSet = new Set<number>(seenIds)

const baseUrl = new URL('https://jobs.apple.com')
const searchUrl = new URL('/en-us/search', baseUrl)
const params = new URLSearchParams({
  location: 'united-states-USA',
  search: 'Software',
  sort: 'newest'
})

const jobs: Job[] = []

parent: for (let page = 1; ; page++) {
  searchUrl.search = params.toString()
  searchUrl.searchParams.set('page', page.toString())

  const candidates = (await fetchHtmlDocument(searchUrl))
    .querySelectorAll<HTMLAnchorElement>('h3 > a')
    .values()
    .filter(it => {
      return (
        it.href.startsWith('/en-us/details/') &&
        checkKeywords(it.textContent, apple.keywords.title)
      )
    })
    .map(it => {
      const url = new URL(it.href, baseUrl)
      const id = Number(url.pathname.split('/').at(3))
      return {
        id,
        title: it.textContent || '',
        url
      } satisfies Job
    })

  for (const candidate of candidates) {
    if (seenIdsSet.has(candidate.id)) {
      break parent
    }
    updatedSeenIdsSet.add(candidate.id)
    const page = await fetchHtmlDocument(candidate.url)
    if (!checkKeywords(page.body.textContent, apple.keywords.description)) {
      continue
    }
    jobs.push(candidate)
  }
}

if (jobs.length) {
  await webhookClient.send({
    content: jobs
      .map(({ title, url }) => `[${title}](<${url}>)`)
      .join(EOL)
      .trim(),
    username: name
  })

  await writeFile(
    'assets/apple-seen-ids.json',
    JSON.stringify(Array.from(updatedSeenIdsSet), null, 2)
  )
}
