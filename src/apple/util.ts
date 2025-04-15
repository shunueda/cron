import { parseHTML } from 'linkedom'

export function checkKeywords(
  text: string | null | undefined,
  keywords: {
    include: string[]
    exclude: string[]
  }
): boolean {
  if (!text) {
    return false
  }
  return (
    keywords.include.every(word => text.includes(word)) &&
    !keywords.exclude.some(word => text.includes(word))
  )
}

export async function fetchHtmlDocument(url: URL): Promise<Document> {
  const res = await fetch(url)
  const html = await res.text()
  return parseHTML(html).document
}
