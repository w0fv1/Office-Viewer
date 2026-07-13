export function xmlRepeat(attributes: string, attribute: string): number {
  const value = Number.parseInt(xmlAttribute(attributes, attribute) || '1', 10)
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function xmlAttribute(value: string, attribute: string): string {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = value.match(new RegExp(`${escaped}="([^"]+)"`))
  return match ? decodeXml(match[1]) : ''
}

export function stripXml(value: string): string {
  return value.replace(/<[^>]+>/g, '')
}

export function decodeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}
