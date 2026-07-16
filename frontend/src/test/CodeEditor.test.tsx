import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CodeEditor } from '../components/CodeEditor'

describe('CodeEditor', () => {
  it('keeps the full highlighted document visible while scrolling', () => {
    const code = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join('\n')
    const { container } = render(<CodeEditor value={code} filename='notes.txt' />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    const overlay = container.querySelector('pre[aria-hidden="true"]') as HTMLPreElement
    const lineNumberTrack = container.querySelector('div[aria-hidden="true"] > div') as HTMLDivElement

    expect(overlay).not.toBeNull()
    expect(overlay.children).toHaveLength(40)
    expect(overlay.className).toContain('min-h-full')
    expect(overlay.className).toContain('w-max')
    expect(overlay.className).not.toContain('inset-0')

    textarea.scrollTop = 180
    textarea.scrollLeft = 24
    fireEvent.scroll(textarea)

    expect(overlay.style.transform).toBe('translate(-24px, -180px)')
    expect(lineNumberTrack.style.transform).toBe('translateY(-180px)')
  })
})
