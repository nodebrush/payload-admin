'use client'

import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

/**
 * Document-header action button for collections with live preview. Calls
 * GET /api/preview-url, gets back the same URL the live-preview iframe uses
 * (including the user's preview_key), and writes it to the clipboard.
 *
 * Hidden on new/unsaved documents (no id yet → no URL to build).
 *
 * Wired in automatically by previewAuthPlugin for every collection listed in
 * admin.livePreview.collections, so projects get this button without any
 * per-project config.
 */
export default function CopyPreviewUrlButton() {
  const { id, collectionSlug } = useDocumentInfo()
  const [state, setState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!id || !collectionSlug) return null

  const handleClick = async () => {
    setState('loading')
    setErrorMessage(null)
    try {
      const res = await fetch(
        `/api/preview-url?collection=${encodeURIComponent(collectionSlug)}&id=${encodeURIComponent(String(id))}`,
      )
      const data = await res.json()
      if (!res.ok || !data.url) {
        setErrorMessage(data.error ?? 'Could not build preview URL')
        setState('error')
        return
      }
      await navigator.clipboard.writeText(data.url)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error')
      setState('error')
    }
  }

  const label =
    state === 'loading' ? 'Copying…' :
    state === 'copied' ? 'Copied!' :
    state === 'error' ? (errorMessage ?? 'Error') :
    'Copy preview URL'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      className="btn btn--icon-style-without-border btn--size-small btn--withoutPopup btn--style-pill"
      title="Copy a shareable URL to this preview. Anyone with the link can view the current draft until your preview token expires."
    >
      <span className="btn__content">
        <span className="btn__label">{label}</span>
      </span>
    </button>
  )
}
