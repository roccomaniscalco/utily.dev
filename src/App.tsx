'use client'

import * as Diff from 'diff'
import { Copy, GitCompare } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
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
  const diff = Diff.diffLines(originalText, modifiedText, {ignoreNewlineAtEof: false})
  return diff
    .map((part) => ({
      type: part.added ? '+' : part.removed ? '-' : (' ' as DiffLine['type']),
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

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useState('')
  const [modifiedText, setModifiedText] = useState('')

  const diffResult = computeDiff(originalText, modifiedText)
  const diffText = diffResult
    .map((line) => `${line.type} ${line.text}`)
    .join('\n')

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(diffText)
  }

  return (
    <div className="mx-auto h-dvh max-w-full p-2">
      <Card className="h-full gap-0 overflow-hidden pb-0">
        <CardHeader className="flex-row justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Diff Viewer
          </CardTitle>
          <CardDescription>
            Compare the differences between two text inputs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={30}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel>
                  <Textarea
                    placeholder="Original text here..."
                    className="h-full resize-none rounded-none border-none px-6 py-0 font-mono dark:bg-transparent"
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                  />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel>
                  <Textarea
                    placeholder="Modified text here..."
                    className="h-full resize-none rounded-none border-none px-6 py-0 font-mono dark:bg-transparent"
                    value={modifiedText}
                    onChange={(e) => setModifiedText(e.target.value)}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="group relative">
              <div className="absolute top-0 right-0 z-10 flex gap-2 p-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="focus-visible::opacity-100 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={handleCopyDiff}
                >
                  <Copy />
                </Button>
              </div>
              <div className="absolute inset-0 overflow-auto">
                {diffResult.length === 0 && (
                  <p className="text-muted-foreground flex h-full items-center justify-center font-mono md:text-sm">
                    No text to compare
                  </p>
                )}
                <pre className="w-fit min-w-full md:text-sm">
                  {diffResult.map((line) => (
                    <div
                      className={cn(
                        'px-2',
                        line.type === '+' && 'text-term-grass bg-term-grass/5',
                        line.type === '-' && 'text-term-red bg-term-red/5',
                      )}
                      key={line.id}
                    >
                      {line.type} {line.text}
                    </div>
                  ))}
                </pre>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </CardContent>
      </Card>
    </div>
  )
}
