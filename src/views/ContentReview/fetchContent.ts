import 'server-only'
import type { Payload } from 'payload'

export interface ContentField {
  path: string
  values: Record<string, string> // locale code -> extracted text
}

export interface ContentDocument {
  type: 'collection' | 'global'
  collection?: string
  collectionLabel?: string
  globalSlug?: string
  globalLabel?: string
  documentId?: string | number
  documentTitle: string
  editUrl: string
  fields: ContentField[]
}

const SKIP_FIELDS = new Set([
  'id',
  '_status',
  'updatedAt',
  'createdAt',
  'localizedPaths',
  'sizes',
  'filename',
  'mimeType',
  'filesize',
  'width',
  'height',
  'focalX',
  'focalY',
  'author',
  'publishedAt',
  'populatedAuthors',
  'hash',
  'salt',
  'url',
  'thumbnailURL',
  'usageCount',
  'usedIn',
  'blockType', // always a dev slug, not user content
])

const SYSTEM_SLUGS = new Set(['users', 'media', 'payload-preferences', 'payload-migrations'])

function isLexical(val: unknown): val is { root: unknown } {
  return typeof val === 'object' && val !== null && !Array.isArray(val) && 'root' in val
}

function lexicalToText(json: unknown): string {
  if (!isLexical(json)) return ''

  function extractInline(node: Record<string, unknown>): string {
    if (node.type === 'text') return String(node.text ?? '')
    const children = node.children as Record<string, unknown>[] | undefined
    return children?.map(extractInline).join('') ?? ''
  }

  function extractBlock(node: Record<string, unknown>): string {
    if (node.type === 'text') return String(node.text ?? '')
    const children = node.children as Record<string, unknown>[] | undefined
    if (!children) return ''
    const type = node.type as string
    if (type === 'root') {
      return children
        .map(extractBlock)
        .filter((s) => s.trim())
        .join('\n\n')
    }
    if (type === 'list') {
      return children
        .map(extractBlock)
        .filter((s) => s.trim())
        .join('\n')
    }
    // paragraph, heading, listitem, quote, etc. — collect inline content
    return children.map(extractInline).join('')
  }

  return extractBlock(json.root as Record<string, unknown>)
    .replace(/[ \t]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .trim()
}

function isLocaleObject(val: unknown, localeCodes: string[]): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false
  if (isLexical(val)) return false
  const keys = Object.keys(val as object)
  if (keys.length === 0) return false
  return keys.every((k) => localeCodes.includes(k))
}

function isMediaRef(val: unknown): boolean {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false
  const obj = val as Record<string, unknown>
  return typeof obj.id === 'number' && typeof obj.filename === 'string'
}

function extractFields(
  value: unknown,
  key: string,
  path: string,
  localeCodes: string[],
  fields: ContentField[],
): void {
  if (SKIP_FIELDS.has(key)) return
  if (value === null || value === undefined) return

  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      extractFields(item, String(i), `${path}[${i}]`, localeCodes, fields)
    })
    return
  }

  if (typeof value === 'object') {
    if (isMediaRef(value)) return

    if (isLocaleObject(value, localeCodes)) {
      const obj = value as Record<string, unknown>
      const values: Record<string, string> = {}
      let hasContent = false
      for (const code of localeCodes) {
        const localeVal = obj[code]
        // Skip numeric values (relation IDs at depth: 0)
        if (typeof localeVal === 'number') continue
        const str = isLexical(localeVal) ? lexicalToText(localeVal) : (typeof localeVal === 'string' ? localeVal : '')
        values[code] = str
        if (str) hasContent = true
      }
      if (hasContent) fields.push({ path, values })
      return
    }

    if (isLexical(value)) {
      const str = lexicalToText(value)
      if (str) {
        const values: Record<string, string> = {}
        for (const code of localeCodes) values[code] = str
        fields.push({ path, values })
      }
      return
    }

    const obj = value as Record<string, unknown>
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_FIELDS.has(k)) continue
      extractFields(v, k, path ? `${path}.${k}` : k, localeCodes, fields)
    }
    return
  }

  // Only include string scalars (skip numbers, booleans — likely IDs or flags)
  if (typeof value === 'string' && value) {
    const values: Record<string, string> = {}
    for (const code of localeCodes) values[code] = value
    fields.push({ path, values })
  }
}

function getDocumentTitle(
  collection: string,
  doc: Record<string, unknown>,
  localeCodes: string[],
): string {
  function resolve(val: unknown): string {
    if (typeof val === 'string') return val
    if (isLocaleObject(val, localeCodes)) {
      const obj = val as Record<string, unknown>
      for (const code of localeCodes) {
        if (typeof obj[code] === 'string' && obj[code]) return obj[code] as string
      }
    }
    return ''
  }
  if (collection === 'menus') return resolve(doc.name) || 'Unnamed menu'
  return resolve(doc.title) || resolve(doc.name) || resolve(doc.metaTitle) || String(doc.id ?? 'Untitled')
}

export async function fetchAllContent(payload: Payload): Promise<{
  documents: ContentDocument[]
  localeCodes: string[]
}> {
  const localeConfig = payload.config.localization !== false ? payload.config.localization : undefined
  const localeCodes: string[] = localeConfig?.locales.map((l) => l.code) ?? ['en']

  const documents: ContentDocument[] = []

  // Collections (skip system/media collections)
  const collections = payload.config.collections.filter((c) => !SYSTEM_SLUGS.has(c.slug))

  for (const collectionConfig of collections) {
    const collectionLabel =
      typeof collectionConfig.labels?.plural === 'string'
        ? collectionConfig.labels.plural
        : collectionConfig.slug

    let page = 1
    while (true) {
      const batch = await payload.find({
        collection: collectionConfig.slug as 'pages',
        depth: 0,
        limit: 50,
        page,
        locale: 'all' as 'en',
        draft: true,
        overrideAccess: true,
      })

      for (const doc of batch.docs) {
        const docRecord = doc as Record<string, unknown>
        const title = getDocumentTitle(collectionConfig.slug, docRecord, localeCodes)
        const fields: ContentField[] = []
        for (const [key, value] of Object.entries(docRecord)) {
          if (SKIP_FIELDS.has(key)) continue
          extractFields(value, key, key, localeCodes, fields)
        }

        documents.push({
          type: 'collection',
          collection: collectionConfig.slug,
          collectionLabel,
          documentId: doc.id as number,
          documentTitle: title,
          editUrl: `/admin/collections/${collectionConfig.slug}/${doc.id}`,
          fields,
        })
      }

      if (!batch.hasNextPage) break
      page++
    }
  }

  // Globals
  for (const globalConfig of payload.config.globals) {
    try {
      const globalLabel =
        typeof globalConfig.label === 'string' ? globalConfig.label : globalConfig.slug

      const doc = await (payload.findGlobal as any)({
        slug: globalConfig.slug,
        depth: 0,
        locale: 'all' as 'en',
        draft: true,
        overrideAccess: true,
      })

      const docRecord = doc as Record<string, unknown>
      const fields: ContentField[] = []
      for (const [key, value] of Object.entries(docRecord)) {
        if (SKIP_FIELDS.has(key)) continue
        extractFields(value, key, key, localeCodes, fields)
      }

      documents.push({
        type: 'global',
        globalSlug: globalConfig.slug,
        globalLabel,
        documentTitle: globalLabel,
        editUrl: `/admin/globals/${globalConfig.slug}`,
        fields,
      })
    } catch {
      // Skip globals that haven't been saved yet
    }
  }

  return { documents, localeCodes }
}
