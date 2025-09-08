import { writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import { setTimeout } from 'node:timers/promises'
import seenIds from '~/assets/apple-seen-ids.json'
import { apple } from '~/assets/config.json'
import { name } from '~/package.json'
import type { Job } from '#apple/types'
import { checkKeywords, fetchHtmlDocument } from '#apple/util'
import { webhookClient } from '#webhook'

const seenIdsSet = new Set<string>(seenIds)
const updatedSeenIdsSet = new Set<string>(seenIds)

const baseUrl = new URL('https://jobs.apple.com')
const searchUrl = new URL('/en-us/search', baseUrl)
const params = new URLSearchParams({
  location: 'united-states-USA',
  search: 'Software',
  sort: 'newest'
})

const jobs: Job[] = []

parent: for (let page = 1; page < 3; page++) {
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
      return {
        id: String(url.pathname.split('/').at(3)),
        title: it.textContent || '',
        url
      } satisfies Job
    })

  for (const candidate of candidates) {
    if (seenIdsSet.has(candidate.id)) {
      break parent
    }
    updatedSeenIdsSet.add(candidate.id)
    await setTimeout(1000)
    console.log({ GETTING: candidate.title, URL: candidate.url.href })
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
