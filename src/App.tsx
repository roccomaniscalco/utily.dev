import { useLocalStorage, useMeasure } from '@uidotdev/usehooks'
import { diffLines } from 'diff'
import { Fragment, useDeferredValue } from 'react'
import { Card, CardHeader, CardTitle } from '~/components/ui/card'
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
  const [originalText, setOriginalText] = useLocalStorage('originalText', '')
  const [modifiedText, setModifiedText] = useLocalStorage('modifiedText', '')
  const [wrapLines, setWrapLines] = useLocalStorage('wrapLines', false)

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
          shouldWrapLines={wrapLines}
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
    <Card className="size-full">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
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
  shouldWrapLines: boolean
}>

function Viewer(props: ViewerProps) {
  const diff = computeDiff(props.originalText, props.modifiedText)
  const diffText = diff.lines
    .map((line) => `${line.type} ${line.text}`)
    .join('')

  const [lineNumbersRef, { width: lineNumbersWidth }] = useMeasure()

  return (
    <Card className="size-full">
      <CardHeader>
        <CardTitle>Difference</CardTitle>
        <div className="flex items-center gap-1.5 text-sm tabular-nums">
          <p className="text-term-green">+{diff.added}</p>
          <p className="text-muted-foreground">/</p>
          <p className="text-term-red">-{diff.removed}</p>
        </div>
      </CardHeader>
      <ScrollArea
        className="min-h-0 flex-1"
        horizontalScrollOffset={lineNumbersWidth}
      >
        <div className="grid min-h-full flex-1 grid-cols-[min-content_1fr] content-start">
          {diff.lines.map((line, index) => (
            <Fragment key={index}>
              <div
                className="bg-card sticky left-0 grid grid-cols-[1fr_1fr] gap-2 px-3 select-none"
                ref={index === 0 ? lineNumbersRef : undefined}
              >
                <p className="text-muted-foreground text-end font-mono text-sm leading-5">
                  {line.originalLine}
                </p>
                <p className="text-muted-foreground text-end font-mono text-sm leading-5">
                  {line.modifiedLine}
                </p>
              </div>
              <pre
                className={cn(
                  'font-mono text-sm leading-5',
                  props.shouldWrapLines
                    ? 'break-all whitespace-pre-wrap'
                    : 'pr-10',
                  line.type === '+' && 'text-term-green bg-term-green/5',
                  line.type === '-' && 'text-term-red bg-term-red/5',
                )}
              >
                {line.type} {line.text}
              </pre>
            </Fragment>
          ))}
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
