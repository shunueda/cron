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
