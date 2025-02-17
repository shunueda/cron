import { writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import { parseHTML } from 'linkedom'
import storage, { apple } from '~/assets/storage.json'
import { name } from '~/package.json'
import type { MatchedJob } from '#apple/types'
import { checkKeywords } from '#apple/util'
import { webhookClient } from '#apple/webhook'

const baseUrl = new URL('https://jobs.apple.com')
const serachUrl = new URL('/en-us/search', baseUrl)
const params = new URLSearchParams({
  location: 'united-states-USA+japan-JPNC',
  search: 'Software',
  sort: 'newest'
})

const matchedJobs: MatchedJob[] = []

for (let i = 1, end = false; !end; i++) {
  serachUrl.search = params.toString()
  serachUrl.searchParams.set('page', i.toString())

  const res = await fetch(serachUrl)
  const html = await res.text()
  const jobs = parseHTML(html).document.querySelectorAll<HTMLAnchorElement>(
    '.table--advanced-search__title'
  )
  for (const job of jobs) {
    if (!checkKeywords(job.textContent, apple.keywords.title)) {
      continue
    }
    const url = new URL(job.href, baseUrl)
    const res = await fetch(url)
    const html = await res.text()
    const { textContent } = parseHTML(html).document.body
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
