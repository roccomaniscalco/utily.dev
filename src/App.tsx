import { useMeasure } from '@uidotdev/usehooks'
import { diffLines } from 'diff'
import { useDeferredValue, useState } from 'react'
import { Card } from '~/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

type Diff = {
  added: number
  removed: number
  lines: {
    type: '+' | '-' | ' '
    text: string
    originalLine: number | null
    modifiedLine: number | null
  }[]
}

function computeDiff(originalText: string, modifiedText: string) {
  const changes = diffLines(originalText, modifiedText, {
    oneChangePerToken: true, // split changes by line instead of by type of change
  })

  const diff: Diff = {
    added: 0,
    removed: 0,
    lines: [],
  }

  let originalLineCount = 0
  let modifiedLineCount = 0

  for (const change of changes) {
    if (change.added) {
      ++diff.added
      diff.lines.push({
        type: '+',
        text: change.value,
        originalLine: null,
        modifiedLine: ++modifiedLineCount,
      })
    } else if (change.removed) {
      ++diff.removed
      diff.lines.push({
        type: '-',
        text: change.value,
        originalLine: ++originalLineCount,
        modifiedLine: null,
      })
    } else {
      diff.lines.push({
        type: ' ',
        text: change.value,
        originalLine: ++originalLineCount,
        modifiedLine: ++modifiedLineCount,
      })
    }
  }

  return diff
}

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useState('')
  const [modifiedText, setModifiedText] = useState('')

  const deferredOriginalText = useDeferredValue(originalText)
  const deferredModifiedText = useDeferredValue(modifiedText)

  return (
    <ResizablePanelGroup
      className="absolute inset-0 p-2"
      direction="horizontal"
    >
      <ResizablePanel>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel>
            <Editor
              title="Original"
              value={originalText}
              onChange={setOriginalText}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>
            <Editor
              title="Modified"
              value={modifiedText}
              onChange={setModifiedText}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <Viewer
          originalText={deferredOriginalText}
          modifiedText={deferredModifiedText}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

type EditorProps = Readonly<{
  title: string
  value: string
  onChange: (value: string) => void
}>
function Editor(props: EditorProps) {
  const lineCount = props.value.split('\n').length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  const [lineNumbersRef, { width: lineNumbersWidth }] = useMeasure()

  return (
    <Card className="size-full gap-0 overflow-clip p-0">
      <div className="border-b px-3 py-1">
        <h2 className="text-muted-foreground text-sm font-semibold uppercase">
          {props.title}
        </h2>
      </div>
      <ScrollArea
        className="isolate min-h-0 flex-1"
        horizontalScrollOffset={lineNumbersWidth}
      >
        <div className="flex min-h-full items-stretch">
          <div
            className="bg-card sticky top-0 left-0 z-10 px-3"
            ref={lineNumbersRef}
          >
            <LineNumbers lineNumbers={lineNumbers} />
          </div>
          <Textarea
            className="flex-1 resize-none rounded-none border-none p-0 pr-10 pb-10 font-mono text-sm leading-5 text-nowrap focus-visible:ring-0 dark:bg-transparent"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
          />
        </div>
      </ScrollArea>
    </Card>
  )
}

type ViewerProps = Readonly<{
  originalText: string
  modifiedText: string
}>
function Viewer(props: ViewerProps) {
  const diff = computeDiff(props.originalText, props.modifiedText)
  const diffText = diff.lines
    .map((line) => `${line.type} ${line.text}`)
    .join('')

  const [lineNumbersRef, { width: lineNumbersWidth }] = useMeasure()

  return (
    <Card className="size-full gap-0 overflow-clip p-0">
      <div className="flex justify-between gap-3 border-b px-3 py-1">
        <h2 className="text-muted-foreground text-sm font-semibold uppercase">
          Difference
        </h2>
        <div
          className="flex items-center gap-1.5 text-sm tabular-nums"
          ref={lineNumbersRef}
        >
          <p className="text-term-green">+{diff.added}</p>
          <p className="text-muted-foreground">/</p>
          <p className="text-term-red">-{diff.removed}</p>
        </div>
      </div>
      <ScrollArea
        className="isolate min-h-0 flex-1"
        horizontalScrollOffset={lineNumbersWidth}
      >
        <div className="flex min-h-full items-stretch">
          <div className="bg-card sticky top-0 left-0 z-10 grid shrink-0 grid-cols-2 gap-2 px-3">
            <LineNumbers lineNumbers={diff.lines.map((l) => l.originalLine)} />
            <LineNumbers lineNumbers={diff.lines.map((l) => l.modifiedLine)} />
          </div>
          <pre className="relative flex-1 text-sm leading-5 select-none">
            {diff.lines.map((line, index) => (
              <div
                className={cn(
                  "pr-10",
                  line.type === '+' && 'text-term-green bg-term-green/5',
                  line.type === '-' && 'text-term-red bg-term-red/5',
                )}
                key={index}
              >
                {line.type} {line.text}
              </div>
            ))}
            <Textarea
              className="absolute inset-0 resize-none overflow-clip rounded-none border-none p-0 font-mono text-sm leading-5 text-nowrap text-transparent focus-visible:ring-0 dark:bg-transparent"
              value={diffText}
              readOnly
            />
          </pre>
        </div>
      </ScrollArea>
    </Card>
  )
}

type LineNumbersProps = Readonly<{
  lineNumbers: (number | null)[]
}>
function LineNumbers(props: LineNumbersProps) {
  return (
    <ol>
      {props.lineNumbers.map((num, index) => (
        <li
          className="text-muted-foreground text-right font-mono text-sm leading-5 select-none"
          key={index}
        >
          {num ?? <br />}
        </li>
      ))}
    </ol>
  )
}
