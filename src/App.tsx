'use client'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'
import * as Diff from 'diff'
import { Copy, Download, GitCompare } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'

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

  const [diffResult, setDiffResult] = useState<DiffLine[]>([])
  const diffText = diffResult
    .map((line) => `${line.type} ${line.text}`)
    .join('\n')

  const handleCompare = () => {
    const diff = computeDiff(originalText, modifiedText)
    setDiffResult(diff)
  }

  useEffect(() => {
    handleCompare()
  }, [originalText, modifiedText])

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(diffText)
  }

  const handleDownloadDiff = () => {
    const blob = new Blob([diffText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'text-diff.txt'
    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto h-dvh max-w-full p-6">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="border-secondary flex-row justify-between border-b p-3">
          <CardTitle className="text-md flex items-center gap-2 font-medium">
            <GitCompare className="h-4 w-4" />
            Diff Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel>
              <Textarea
                placeholder="Original text here..."
                className="h-full resize-none rounded-none border-none font-mono"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel>
              <Textarea
                placeholder="Modified text here..."
                className="h-full resize-none rounded-none border-none font-mono"
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="group relative bg-neutral-900/50">
              <div className="absolute top-0 right-0 z-10 flex gap-2 p-2">
                <Button
                  variant="outline"
                  className="focus-visible::opacity-100 p-3 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={handleCopyDiff}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="focus-visible::opacity-100 p-3 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={handleDownloadDiff}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute inset-0 overflow-auto">
                {diffResult.length === 0 && (
                  <p className="text-muted-foreground flex h-full items-center justify-center font-mono text-sm">
                    No text to compare
                  </p>
                )}
                <pre className="w-fit min-w-full py-2 md:text-sm">
                  {diffResult.map((line) => (
                    <div
                      className={cn(
                        'px-2',
                        line.type === '+' && 'bg-green-950 text-green-100',
                        line.type === '-' && 'bg-red-950 text-red-100',
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
