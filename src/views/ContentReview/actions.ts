'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

export async function markDocumentReviewed(key: string, docUpdatedAt: string): Promise<void> {
  const payload = await getPayload({ config })

  // Globals without versioning have no updatedAt — store review time as fallback
  const timestamp = docUpdatedAt || new Date().toISOString()

  const existing = await payload.find({
    collection: 'content-review-notes',
    where: { key: { equals: key } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'content-review-notes',
      id: existing.docs[0].id as number,
      data: { docUpdatedAt: timestamp },
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'content-review-notes',
      data: { key, docUpdatedAt: timestamp },
      overrideAccess: true,
    })
  }
}

export async function unmarkDocumentReviewed(key: string): Promise<void> {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'content-review-notes',
    where: { key: { equals: key } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    await payload.delete({
      collection: 'content-review-notes',
      id: existing.docs[0].id as number,
      overrideAccess: true,
    })
  }
}
