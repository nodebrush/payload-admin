'use client'

import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { $generateNodesFromDOM } from '@payloadcms/richtext-lexical/lexical/html'
import {
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH,
    PASTE_COMMAND,
    type LexicalEditor,
    type TextNode,
} from '@payloadcms/richtext-lexical/lexical'
import { useEffect } from 'react'

import {
    containsFormattedUnicode,
    needsNormalization,
    stripHashtagPrefix,
    toFormattedRuns,
} from './transform'

const HASHTAG_ANCHOR_PATTERN = /hashtag\s*#/i

/**
 * LinkedIn renders hashtag links with an accessibility span —
 * `<a><span aria-hidden="true">hashtag</span>#Tag</a>` — so "hashtag" and
 * "#Tag" land in separate text nodes. Detect that pattern at the anchor
 * level and collapse the anchor's contents to a single cleaned text node.
 */
function cleanHashtagAnchors(root: HTMLElement): void {
    const anchors = root.querySelectorAll('a')
    for (const anchor of Array.from(anchors)) {
        const text = anchor.textContent ?? ''
        if (!HASHTAG_ANCHOR_PATTERN.test(text)) continue
        anchor.textContent = text.replace(/hashtag\s*#/gi, '#')
    }
}

/**
 * Walks all text nodes beneath `root` and rewrites any that need
 * normalisation — either because they contain Unicode Mathematical
 * Alphanumeric "fake bold/italic" chars, or because they contain LinkedIn's
 * "hashtag#" prefix artifact. Formatted runs become <strong>/<em> wrapped
 * ASCII; the hashtag prefix is simply stripped. Surrounding structure
 * (links, paragraphs, etc.) is preserved.
 */
function rewriteInDom(root: HTMLElement, doc: Document): void {
    cleanHashtagAnchors(root)

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const targets: Text[] = []
    let current = walker.nextNode() as Text | null
    while (current) {
        if (needsNormalization(current.data)) targets.push(current)
        current = walker.nextNode() as Text | null
    }

    for (const textNode of targets) {
        if (containsFormattedUnicode(textNode.data)) {
            const runs = toFormattedRuns(textNode.data)
            const fragment = doc.createDocumentFragment()
            for (const run of runs) {
                let host: Node = doc.createTextNode(run.text)
                if (run.format.italic) {
                    const em = doc.createElement('em')
                    em.appendChild(host)
                    host = em
                }
                if (run.format.bold) {
                    const strong = doc.createElement('strong')
                    strong.appendChild(host)
                    host = strong
                }
                fragment.appendChild(host)
            }
            textNode.parentNode?.replaceChild(fragment, textNode)
        } else {
            textNode.data = stripHashtagPrefix(textNode.data)
        }
    }
}

function handlePaste(event: ClipboardEvent, editor: LexicalEditor): boolean {
    const clipboardData = event.clipboardData
    if (!clipboardData) return false

    const plainText = clipboardData.getData('text/plain')
    const html = clipboardData.getData('text/html')

    const plainNeeds = plainText ? needsNormalization(plainText) : false
    const htmlNeeds = html ? needsNormalization(html) : false
    if (!plainNeeds && !htmlNeeds) return false

    event.preventDefault()

    if (html) {
        const parser = new DOMParser()
        const dom = parser.parseFromString(html, 'text/html')
        rewriteInDom(dom.body, dom)

        editor.update(() => {
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const nodes = $generateNodesFromDOM(editor, dom)
            selection.insertNodes(nodes)
        })
        return true
    }

    const runs = toFormattedRuns(plainText)
    editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        const nodes: TextNode[] = runs.map(run => {
            const node = $createTextNode(run.text)
            if (run.format.bold) node.toggleFormat('bold')
            if (run.format.italic) node.toggleFormat('italic')
            return node
        })
        selection.insertNodes(nodes)
    })

    return true
}

export function UnicodeFormattingPastePlugin(): null {
    const [ editor ] = useLexicalComposerContext()

    useEffect(() => {
        return editor.registerCommand<ClipboardEvent>(
            PASTE_COMMAND,
            event => handlePaste(event, editor),
            COMMAND_PRIORITY_HIGH,
        )
    }, [ editor ])

    return null
}
