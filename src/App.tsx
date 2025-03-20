'use client'

import * as Diff from 'diff'
import { Check, Copy } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

type DiffLine = {
  type: '+' | '-' | ' '
  text: string
  id: string
}

// Using the diff library to compute differences
function computeDiff(originalText: string, modifiedText: string) {
  const diff = Diff.diffLines(originalText, modifiedText)
  return diff
    .map((part) => ({
      type: getPartType(part),
      lines: part.value.replace(/\n$/, '').split('\n'),
    }))
    .flatMap((part) =>
      part.lines.map((line) => ({
        id: nanoid(),
        type: part.type,
        text: line,
      })),
    )
}

function getPartType(part: Diff.Change) {
  if (part.added) return '+' as const
  if (part.removed) return '-' as const
  return ' ' as const
}

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useState('')
  const [modifiedText, setModifiedText] = useState('')
  const diffLines = computeDiff(originalText, modifiedText)

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
              <Viewer diffLines={diffLines} />
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
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="flex h-fit min-h-full">
        <LineNumbers lineCount={lineCount} />
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
  diffLines: DiffLine[]
}>
function Viewer(props: ViewerProps) {
  const diffText = props.diffLines
    .map((line) => `${line.type} ${line.text}`)
    .join('\n')

  return (
    <>
      <div className="absolute top-0 right-0 z-10 p-2">
        <CopyButton text={diffText} />
      </div>
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex h-fit min-h-full">
          <LineNumbers lineCount={props.diffLines.length} />
          <div className="flex-1 overflow-x-auto">
            <pre className="relative h-fit min-h-full w-fit min-w-full text-sm leading-5 select-none">
              {props.diffLines.map((line) => (
                <div
                  className={cn(
                    line.type === '+' && 'text-term-green bg-term-green/5',
                    line.type === '-' && 'text-term-red bg-term-red/5',
                  )}
                  key={line.id}
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
}

type LineNumbersProps = Readonly<{
  lineCount: number
}>
function LineNumbers(props: LineNumbersProps) {
  const lineNumbers = Array.from({ length: props.lineCount }, (_, i) => i + 1)
  return (
    <ol>
      {lineNumbers.map((lineNumber) => (
        <li
          key={lineNumber}
          className="text-muted-foreground w-content min-w-[3em] px-3 text-right font-mono text-sm leading-5 select-none"
        >
          {lineNumber}
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
