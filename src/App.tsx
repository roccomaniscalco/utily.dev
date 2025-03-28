import { diffLines } from 'diff'
import { Check, Copy } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

type Diff = {
  type: '+' | '-' | ' '
  text: string
  originalLine: number | null
  modifiedLine: number | null
}

function computeDiff(originalText: string, modifiedText: string) {
  const changes = diffLines(originalText, modifiedText, {
    oneChangePerToken: true, // split changes by line instead of by type of change
  })

  const diffs: Diff[] = []
  let originalLineCount = 0
  let modifiedLineCount = 0

  for (const change of changes) {
    if (change.added) {
      diffs.push({
        type: '+',
        text: change.value,
        originalLine: null,
        modifiedLine: ++modifiedLineCount,
      })
    } else if (change.removed) {
      diffs.push({
        type: '-',
        text: change.value,
        originalLine: ++originalLineCount,
        modifiedLine: null,
      })
    } else {
      diffs.push({
        type: ' ',
        text: change.value,
        originalLine: ++originalLineCount,
        modifiedLine: ++modifiedLineCount,
      })
    }
  }

  return diffs
}

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useState('')
  const [modifiedText, setModifiedText] = useState('')

  const deferredOriginalText = useDeferredValue(originalText)
  const deferredModifiedText = useDeferredValue(modifiedText)

  return (
    <div className="mx-auto h-dvh max-w-full p-2">
      <Card className="h-full gap-0 overflow-clip p-0">
        <CardContent className="relative flex-1 p-0">
          <ResizablePanelGroup
            className="absolute inset-0"
            direction="horizontal"
          >
            <ResizablePanel defaultSize={30}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel>
                  <Editor value={originalText} onChange={setOriginalText} />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel>
                  <Editor value={modifiedText} onChange={setModifiedText} />
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
        </CardContent>
      </Card>
    </div>
  )
}

type EditorProps = Readonly<{
  value: string
  onChange: (value: string) => void
}>
function Editor(props: EditorProps) {
  const lineCount = props.value.split('\n').length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  return (
    <ScrollArea className="isolate size-full">
      <div className="flex items-stretch min-h-full">
        <div className="bg-card sticky top-0 left-0 z-10 px-3">
          <LineNumbers lineNumbers={lineNumbers} />
        </div>
        <Textarea
          className="flex-1 resize-none rounded-none border-none p-0 font-mono text-sm leading-5 text-nowrap focus-visible:ring-0 dark:bg-transparent"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </div>
    </ScrollArea>
  )
}

type ViewerProps = Readonly<{
  originalText: string
  modifiedText: string
}>
function Viewer(props: ViewerProps) {
  const diffs = computeDiff(props.originalText, props.modifiedText)
  const diffText = diffs.map((line) => `${line.type} ${line.text}`).join('')

  return (
    <ScrollArea className="relative isolate size-full">
      <div className="absolute top-0 right-0 z-10 p-2">
        <CopyButton text={diffText} />
      </div>
      <div className="flex items-stretch min-h-full">
        <div className="bg-card sticky top-0 left-0 z-10 grid shrink-0 grid-cols-2 gap-2 px-3">
          <LineNumbers lineNumbers={diffs.map((l) => l.originalLine)} />
          <LineNumbers lineNumbers={diffs.map((l) => l.modifiedLine)} />
        </div>
        <pre className="relative flex-1 text-sm leading-5 select-none">
          {diffs.map((line, index) => (
            <div
              className={cn(
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

type CopyButtonProps = Readonly<{
  text: string
}>
function CopyButton(props: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleClick = () => {
    navigator.clipboard.writeText(props.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="icon" onClick={handleClick}>
      {copied ? (
        <Check className="animate-in fade-in duration-200" />
      ) : (
        <Copy className="animate-in fade-in duration-200" />
      )}
    </Button>
  )
}
