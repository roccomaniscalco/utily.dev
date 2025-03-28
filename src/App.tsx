import { diffLines } from 'diff'
import { Check, Copy } from 'lucide-react'
import { memo, useDeferredValue, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable'
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
      <Card className="h-full gap-0 overflow-hidden p-0">
        <CardContent className="flex-1 p-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={30}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel className="relative">
                  <Editor value={originalText} onChange={setOriginalText} />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel className="relative">
                  <Editor value={modifiedText} onChange={setModifiedText} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="group relative">
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
    <div className="absolute inset-0 overflow-y-auto">
      <div className="flex h-fit min-h-full">
        <div className="px-3">
          <LineNumbers lineNumbers={lineNumbers} />
        </div>
        <Textarea
          className="h-auto resize-none rounded-none border-none p-0 font-mono text-sm leading-5 text-nowrap focus-visible:ring-0 dark:bg-transparent"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

type ViewerProps = Readonly<{
  originalText: string
  modifiedText: string
}>
const Viewer = memo(function (props: ViewerProps) {
  const diffs = computeDiff(props.originalText, props.modifiedText)
  const diffText = diffs.map((line) => `${line.type} ${line.text}`).join()

  return (
    <>
      <div className="absolute top-0 right-0 z-10 p-2">
        <CopyButton text={diffText} />
      </div>
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex h-fit min-h-full">
          <div className="grid grid-cols-2 gap-2 px-3">
            <LineNumbers lineNumbers={diffs.map((l) => l.originalLine)} />
            <LineNumbers lineNumbers={diffs.map((l) => l.modifiedLine)} />
          </div>
          <div className="flex-1 overflow-x-auto">
            <pre className="relative h-fit min-h-full w-fit min-w-full text-sm leading-5 select-none">
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
                className="absolute inset-0 resize-none rounded-none border-none p-0 font-mono text-sm leading-5 text-nowrap text-transparent focus-visible:ring-0 dark:bg-transparent"
                value={diffText}
                readOnly
              />
            </pre>
          </div>
        </div>
      </div>
    </>
  )
})

type LineNumbersProps = Readonly<{
  lineNumbers: (number | null)[]
}>
function LineNumbers(props: LineNumbersProps) {
  return (
    <ol className="flex-1">
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
    <Button
      variant="outline"
      size="icon"
      className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
      onClick={handleClick}
    >
      {copied ? (
        <Check className="animate-in fade-in duration-200" />
      ) : (
        <Copy className="animate-in fade-in duration-200" />
      )}
    </Button>
  )
}
