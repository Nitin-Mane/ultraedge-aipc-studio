import { useRef, useEffect, useState, useCallback } from 'react'
import { Highlight, type PrismTheme } from 'prism-react-renderer'

// VS Code Dark+ inspired custom theme
const vsCodeTheme: PrismTheme = {
  plain: {
    color: '#D4D4D4',
    backgroundColor: '#0a0e17',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6A9955' } },
    { types: ['punctuation'], style: { color: '#D4D4D4' } },
    { types: ['namespace'], style: { opacity: 0.7 } },
    { types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol', 'deleted'], style: { color: '#B5CEA8' } },
    { types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'], style: { color: '#CE9178' } },
    { types: ['operator', 'entity', 'url'], style: { color: '#D4D4D4' } },
    { types: ['atrule', 'attr-value', 'keyword'], style: { color: '#569CD6' } },
    { types: ['function', 'class-name'], style: { color: '#DCDCAA' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#D16969' } },
    { types: ['important', 'weight'], style: { color: '#D4D4D4', fontWeight: 'bold' } },
    { types: ['italic'], style: { fontStyle: 'italic' } },
    { types: ['entity'], style: { color: '#569CD6' } },
    { types: ['template-string', 'template-punctuation'], style: { color: '#CE9178' } },
  ],
}

// Map file extension to Prism language
function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
    xml: 'xml', html: 'markup', css: 'css', scss: 'scss',
    md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash',
    zsh: 'bash', ps1: 'powershell', dockerfile: 'docker',
    makefile: 'makefile', graphql: 'graphql', proto: 'protobuf',
  }
  return map[ext] || 'plaintext'
}

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  filename?: string
  readOnly?: boolean
  className?: string
}

export function CodeEditor({ value, onChange, filename = 'file.txt', readOnly = false, className = '' }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const codeOverlayRef = useRef<HTMLPreElement>(null)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)
  const language = getLanguage(filename)
  const lines = value.split('\n')
  const lineCount = lines.length

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop
      const left = textareaRef.current.scrollLeft
      if (lineNumbersRef.current) lineNumbersRef.current.style.transform = `translateY(-${top}px)`
      if (codeOverlayRef.current) codeOverlayRef.current.style.transform = `translate(-${left}px, -${top}px)`
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange?.(newValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }, [value, onChange])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }, [onChange])

  const updateCursor = useCallback(() => {
    if (textareaRef.current) {
      const pos = textareaRef.current.selectionStart
      const textBefore = value.substring(0, pos)
      const linesBefore = textBefore.split('\n')
      setCursorLine(linesBefore.length)
      setCursorCol(linesBefore[linesBefore.length - 1].length + 1)
    }
  }, [value])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.addEventListener('keyup', updateCursor)
    ta.addEventListener('click', updateCursor)
    return () => {
      ta.removeEventListener('keyup', updateCursor)
      ta.removeEventListener('click', updateCursor)
    }
  }, [updateCursor])

  return (
    <div className={`relative flex flex-col h-full bg-[#0a0e17] font-mono text-[12px] leading-[1.5] ${className}`}>
      {/* Top bar — filename + cursor position */}
      <div className='flex-shrink-0 flex items-center justify-between px-3 h-7 bg-[#1e1e1e] border-b border-[#333] text-[10px]'>
        <span className='text-[#858585]'>{filename}</span>
        <span className='text-[#858585]'>Ln {cursorLine}, Col {cursorCol}</span>
      </div>

      <div className='flex-1 min-h-0 flex overflow-hidden'>
        {/* Line Numbers */}
        <div aria-hidden='true' className='flex-shrink-0 w-12 bg-[#0a0e17] border-r border-[#1e293b] overflow-hidden select-none'>
          <div ref={lineNumbersRef} className='pt-3'>
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className={`text-right pr-3 pl-2 ${
                  i + 1 === cursorLine ? 'text-[#c6c6c6] bg-[#2a2d2e]' : 'text-[#858585]'
                }`}
                style={{ height: '1.5em', lineHeight: '1.5em', fontSize: '12px' }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Code Area — syntax highlighted overlay + hidden textarea */}
        <div className='flex-1 min-w-0 relative overflow-hidden'>
          {/* Highlighted code overlay */}
          <Highlight theme={vsCodeTheme} code={value} language={language}>
            {(highlightProps) => (
              <pre
                ref={codeOverlayRef}
                aria-hidden='true'
                className={`${highlightProps.className} pointer-events-none absolute left-0 top-0 m-0 min-h-full min-w-full w-max overflow-visible whitespace-pre p-3 font-mono text-[12px] leading-[1.5]`}
                style={{
                  ...highlightProps.style,
                  backgroundColor: 'transparent',
                }}
              >
                {highlightProps.tokens.map((line, i) => {
                  const lineProps = highlightProps.getLineProps({ line, key: i })
                  return (
                    <div key={i} {...lineProps} className={`${lineProps.className || ''}`} style={{ ...lineProps.style, minHeight: '1.5em' }}>
                      {line.map((token, key) => {
                        const tokenProps = highlightProps.getTokenProps({ token, key })
                        return <span key={key} {...tokenProps} />
                      })}
                      {line.length === 0 && '\n'}
                    </div>
                  )
                })}
              </pre>
            )}
          </Highlight>

          {/* Actual editable textarea — transparent text, sits on top */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            className='absolute inset-0 w-full h-full p-3 m-0 font-mono text-transparent caret-[#aeafad] bg-transparent resize-none focus:outline-none whitespace-pre overflow-auto'
            style={{ fontSize: '12px', lineHeight: '1.5em', zIndex: 1, caretColor: '#aeafad' }}
          />
        </div>
      </div>
    </div>
  )
}
