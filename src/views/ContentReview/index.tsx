'use client'

import React, { useMemo, useState } from 'react'
import type { ContentDocument } from './fetchContent'

type Props = {
  documents: ContentDocument[]
  localeCodes: string[]
}

const MARKED_STYLE = `
  .cr-row { cursor: pointer; border-left: 3px solid transparent; transition: background 0.1s; }
  .cr-row:hover { background: rgba(255,255,255,0.03); }
  .cr-row-marked { border-left: 3px solid #f59e0b !important; background: rgba(245, 158, 11, 0.06) !important; }
  .cr-row-marked:hover { background: rgba(245, 158, 11, 0.1) !important; }
`

function getDocKey(doc: ContentDocument): string {
  return doc.type === 'collection'
    ? `col:${doc.collection}:::${doc.documentId}`
    : `glob:${doc.globalSlug}`
}

function makeFieldKey(docKey: string, fieldPath: string): string {
  return `${docKey}|||${fieldPath}`
}

const selectStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100, #222)',
  border: '1px solid var(--theme-elevation-200, #333)',
  color: 'var(--theme-text, #eee)',
  borderRadius: '3px',
  padding: '4px 8px',
  fontSize: '13px',
  cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--theme-elevation-500)',
  borderRight: '1px solid var(--theme-elevation-100, #222)',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'top',
  borderRight: '1px solid var(--theme-elevation-100, #222)',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

function DocumentCard({
  doc,
  localeA,
  localeB,
  markedFields,
  onToggleMark,
  showOnlyMarked,
}: {
  doc: ContentDocument
  localeA: string
  localeB: string
  markedFields: Set<string>
  onToggleMark: (key: string) => void
  showOnlyMarked: boolean
}) {
  const docKey = getDocKey(doc)
  const collectionLabel =
    doc.type === 'collection'
      ? doc.collectionLabel ?? doc.collection
      : `Global: ${doc.globalLabel ?? doc.globalSlug}`

  const visibleFields = showOnlyMarked
    ? doc.fields.filter((f) => markedFields.has(makeFieldKey(docKey, f.path)))
    : doc.fields

  const markedCount = doc.fields.filter((f) => markedFields.has(makeFieldKey(docKey, f.path))).length

  return (
    <div
      style={{
        marginBottom: '20px',
        border: '1px solid var(--theme-elevation-150, #2a2a2a)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--theme-elevation-50, #1a1a1a)',
          borderBottom: '1px solid var(--theme-elevation-150, #2a2a2a)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--theme-elevation-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {collectionLabel}
          </span>
          <h3 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {doc.documentTitle}
            {markedCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '1px 7px',
                }}
              >
                {markedCount} marked
              </span>
            )}
          </h3>
        </div>
        <a
          href={doc.editUrl}
          style={{
            fontSize: '12px',
            color: 'var(--theme-elevation-500)',
            textDecoration: 'none',
            padding: '4px 8px',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: '3px',
            flexShrink: 0,
          }}
        >
          Edit
        </a>
      </div>

      {/* Fields table */}
      {visibleFields.length === 0 ? (
        <div
          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--theme-elevation-400)' }}
        >
          No text content.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--theme-elevation-25, #161616)' }}>
              <th style={{ ...thStyle, width: '180px' }}>Field</th>
              <th style={thStyle}>{localeA.toUpperCase()}</th>
              <th style={{ ...thStyle, borderRight: 'none' }}>{localeB.toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {visibleFields.map((field, i) => {
              const fieldKey = makeFieldKey(docKey, field.path)
              const isMarked = markedFields.has(fieldKey)
              const aVal = field.values[localeA] ?? ''
              const bVal = field.values[localeB] ?? ''
              const same = aVal === bVal
              return (
                <tr
                  key={i}
                  className={`cr-row${isMarked ? ' cr-row-marked' : ''}`}
                  onClick={() => onToggleMark(fieldKey)}
                  style={{ borderTop: '1px solid var(--theme-elevation-100, #222)' }}
                  title={isMarked ? 'Click to unmark' : 'Click to mark for edit'}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'var(--theme-elevation-500)',
                      width: '180px',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={field.path}
                  >
                    {field.path}
                  </td>
                  <td style={tdStyle}>{aVal}</td>
                  <td
                    style={{
                      ...tdStyle,
                      borderRight: 'none',
                      color: same ? 'var(--theme-elevation-500)' : 'inherit',
                    }}
                  >
                    {bVal}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ContentReviewList({ documents, localeCodes }: Props) {
  const [localeA, setLocaleA] = useState(localeCodes[0] ?? 'en')
  const [localeB, setLocaleB] = useState(localeCodes[1] ?? localeCodes[0] ?? 'en')
  const [filterKey, setFilterKey] = useState('all')
  const [markedFields, setMarkedFields] = useState(new Set<string>())
  const [showOnlyMarked, setShowOnlyMarked] = useState(false)

  const handleToggleMark = (key: string) => {
    setMarkedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const groupOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: Array<{ key: string; label: string }> = []
    for (const doc of documents) {
      const key =
        doc.type === 'collection' ? `col:${doc.collection}` : `glob:${doc.globalSlug}`
      if (!seen.has(key)) {
        seen.add(key)
        opts.push({
          key,
          label:
            doc.type === 'collection'
              ? (doc.collectionLabel ?? doc.collection ?? '')
              : `[Global] ${doc.globalLabel ?? doc.globalSlug ?? ''}`,
        })
      }
    }
    return opts
  }, [documents])

  const filtered = useMemo(() => {
    if (filterKey === 'all') return documents
    return documents.filter((doc) => {
      const key =
        doc.type === 'collection' ? `col:${doc.collection}` : `glob:${doc.globalSlug}`
      return key === filterKey
    })
  }, [documents, filterKey])

  const displayDocs = useMemo(() => {
    if (!showOnlyMarked) return filtered
    return filtered.filter((doc) => {
      const docKey = getDocKey(doc)
      return doc.fields.some((f) => markedFields.has(makeFieldKey(docKey, f.path)))
    })
  }, [filtered, markedFields, showOnlyMarked])

  const markedCount = markedFields.size

  const handleExportAll = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      locales: localeCodes,
      documents: filtered.map((doc) => ({
        title: doc.documentTitle,
        type: doc.type,
        source: doc.collection ?? doc.globalSlug,
        editUrl: doc.editUrl,
        fields: doc.fields.map((f) => {
          const entry: Record<string, string> = { path: f.path }
          for (const code of localeCodes) entry[code] = f.values[code] ?? ''
          return entry
        }),
      })),
    }
    downloadJson(data, `content-review-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const handleExportMarked = () => {
    const markedDocs = documents.filter((doc) => {
      const docKey = getDocKey(doc)
      return doc.fields.some((f) => markedFields.has(makeFieldKey(docKey, f.path)))
    })
    const data = {
      exportedAt: new Date().toISOString(),
      locales: localeCodes,
      markedForEdit: true,
      documents: markedDocs.map((doc) => {
        const docKey = getDocKey(doc)
        return {
          title: doc.documentTitle,
          type: doc.type,
          source: doc.collection ?? doc.globalSlug,
          editUrl: doc.editUrl,
          fields: doc.fields
            .filter((f) => markedFields.has(makeFieldKey(docKey, f.path)))
            .map((f) => {
              const entry: Record<string, string> = { path: f.path }
              for (const code of localeCodes) entry[code] = f.values[code] ?? ''
              return entry
            }),
        }
      }),
    }
    downloadJson(data, `content-review-marked-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const showLocaleSelectors = localeCodes.length > 2

  return (
    <>
      <style>{MARKED_STYLE}</style>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'var(--theme-elevation-0, #1a1a1a)',
          border: '1px solid var(--theme-elevation-150, #2a2a2a)',
          borderRadius: '4px',
        }}
      >
        {showLocaleSelectors && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--theme-elevation-500)' }}>Left:</span>
              <select value={localeA} onChange={(e) => setLocaleA(e.target.value)} style={selectStyle}>
                {localeCodes.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--theme-elevation-500)' }}>Right:</span>
              <select value={localeB} onChange={(e) => setLocaleB(e.target.value)} style={selectStyle}>
                {localeCodes.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </label>
            <span style={{ display: 'inline-block', width: '1px', height: '20px', background: 'var(--theme-elevation-200)' }} />
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <span style={{ color: 'var(--theme-elevation-500)' }}>Show:</span>
          <select value={filterKey} onChange={(e) => setFilterKey(e.target.value)} style={selectStyle}>
            <option value="all">All ({documents.length})</option>
            {groupOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </label>

        <span style={{ display: 'inline-block', width: '1px', height: '20px', background: 'var(--theme-elevation-200)' }} />

        <button type="button" onClick={handleExportAll} style={selectStyle}>
          Export JSON
        </button>

        <button
          type="button"
          onClick={handleExportMarked}
          disabled={markedCount === 0}
          style={{
            ...selectStyle,
            opacity: markedCount === 0 ? 0.4 : 1,
            borderColor: markedCount > 0 ? 'rgba(245,158,11,0.5)' : undefined,
            color: markedCount > 0 ? '#f59e0b' : undefined,
          }}
        >
          Export Marked ({markedCount})
        </button>

        <button
          type="button"
          onClick={() => setShowOnlyMarked((v) => !v)}
          disabled={markedCount === 0 && !showOnlyMarked}
          style={{
            ...selectStyle,
            opacity: markedCount === 0 && !showOnlyMarked ? 0.4 : 1,
            borderColor: showOnlyMarked ? 'rgba(245,158,11,0.5)' : undefined,
            color: showOnlyMarked ? '#f59e0b' : undefined,
            background: showOnlyMarked ? 'rgba(245,158,11,0.08)' : undefined,
          }}
        >
          {showOnlyMarked ? 'Show All' : 'Show Marked Only'}
        </button>

        <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--theme-elevation-400)' }}>
          {displayDocs.length} doc{displayDocs.length !== 1 ? 's' : ''}
          {!showLocaleSelectors && ` · ${localeA.toUpperCase()} vs ${localeB.toUpperCase()}`}
        </span>
      </div>

      {/* Document list */}
      {displayDocs.length === 0 ? (
        <p style={{ color: 'var(--theme-elevation-400)', fontSize: '14px' }}>
          {showOnlyMarked ? 'No marked fields yet. Click rows to mark them.' : 'No documents.'}
        </p>
      ) : (
        displayDocs.map((doc, i) => (
          <DocumentCard
            key={i}
            doc={doc}
            localeA={localeA}
            localeB={localeB}
            markedFields={markedFields}
            onToggleMark={handleToggleMark}
            showOnlyMarked={showOnlyMarked}
          />
        ))
      )}
    </>
  )
}
