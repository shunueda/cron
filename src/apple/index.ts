import { writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import storage, { apple } from '~/assets/storage.json'
import { name } from '~/package.json'
import type { MatchedJob } from '#apple/types'
import { checkKeywords, fetchHtml } from '#apple/util'
import { webhookClient } from '#apple/webhook'

const baseUrl = new URL('https://jobs.apple.com')
const serachUrl = new URL('/en-us/search', baseUrl)
const params = new URLSearchParams({
  location: 'united-states-USA',
  search: 'Software',
  sort: 'newest'
})

const matchedJobs: MatchedJob[] = []

for (let i = 1, end = false; !end; i++) {
  serachUrl.search = params.toString()
  serachUrl.searchParams.set('page', i.toString())
  const jobs =
    (await fetchHtml(serachUrl)).document
      .getElementById('search-job-list')
      ?.querySelectorAll<HTMLAnchorElement>('a')
      ?.values()
      ?.filter(job => job.href.startsWith('/en-us/details/'))
      ?.toArray() || []
  for (const job of jobs) {
    if (!checkKeywords(job.textContent, apple.keywords.title)) {
      continue
    }
    const url = new URL(job.href, baseUrl)
    const { textContent } = (await fetchHtml(url)).document.body
    if (!checkKeywords(textContent, apple.keywords.description)) {
      continue
    }
    const id = url.pathname.split('/').at(3)
    if (!id || apple.checkpoint === id) {
      end = true
      break
    }
    matchedJobs.push({
      id,
      title: job.textContent || '',
      url
    })
  }
}

if (matchedJobs.length) {
  await webhookClient.send({
    content: matchedJobs
      .map(({ title, url }) => `[${title}](<${url}>)`)
      .join(EOL)
      .trim(),
    username: name
  })
  storage.apple.checkpoint = matchedJobs[0].id
} else {
  console.log('No new jobs found')
}

await writeFile('assets/storage.json', JSON.stringify(storage, null, 2))
