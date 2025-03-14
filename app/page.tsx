"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { FileText, GitCompare, Copy, Download } from "lucide-react"
import * as Diff from "diff"
import { useVirtualizer } from "@tanstack/react-virtual"

// Using the diff library to compute differences
function computeDiff(oldText: string, newText: string) {
  // Use diffLines from the diff library
  const diffResult = Diff.diffLines(oldText, newText)

  // Convert the diff library format to our format
  return diffResult
    .map((part) => ({
      type: part.added ? "added" : part.removed ? "removed" : "same",
      // Split the text into lines to maintain our line-by-line display
      lines: part.value.replace(/\n$/, "").split("\n"),
    }))
    .flatMap((part) =>
      // Create an entry for each line
      part.lines.map((line) => ({
        type: part.type,
        text: line,
      })),
    )
}

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useState(
    "This is a test.\nIt has multiple lines.\nSome lines will be changed.\nOthers will stay the same.",
  )
  const [modifiedText, setModifiedText] = useState(
    "This is a test.\nIt has several lines.\nSome lines will be modified.\nOthers will stay the same.\nAnd here's a new line.",
  )
  const [diffResult, setDiffResult] = useState<Array<{ type: string; text: string }>>([])
  const [activeTab, setActiveTab] = useState("input")
  const [diffCalculated, setDiffCalculated] = useState(false)

  // Reference to the scrollable container
  const parentRef = useRef<HTMLDivElement>(null)

  // Create a virtualizer
  const rowVirtualizer = useVirtualizer({
    count: diffResult.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24, // Estimated height of each row in pixels
    overscan: 5, // Number of items to render before and after the visible area
  })

  // Calculate diff on initial load
  useEffect(() => {
    const diff = computeDiff(originalText, modifiedText)
    setDiffResult(diff)
    setDiffCalculated(true)
  }, [])

  // Force virtualizer to recalculate when tab changes or diff result changes
  useEffect(() => {
    if (activeTab === "diff" && parentRef.current) {
      // Force a recalculation of the virtualizer
      rowVirtualizer.measure()
    }
  }, [activeTab, diffResult, rowVirtualizer])

  const handleTabChange = (value: string) => {
    // If switching to diff tab, make sure diff is calculated
    if (value === "diff" && !diffCalculated) {
      const diff = computeDiff(originalText, modifiedText)
      setDiffResult(diff)
      setDiffCalculated(true)
    }
    setActiveTab(value)
  }

  const handleCompare = () => {
    console.log("Computing diff...")
    const diff = computeDiff(originalText, modifiedText)
    console.log(`Diff result has ${diff.length} items`)
    setDiffResult(diff)
    setDiffCalculated(true)
    setActiveTab("diff")

    // Schedule a measurement after the state updates
    setTimeout(() => {
      if (parentRef.current) {
        rowVirtualizer.measure()
      }
    }, 0)
  }

  const handleCopyDiff = () => {
    const diffText = diffResult
      .map((line) => {
        const prefix = line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "
        return prefix + line.text
      })
      .join("\n")

    navigator.clipboard
      .writeText(diffText)
      .then(() => alert("Diff copied to clipboard"))
      .catch((err) => console.error("Failed to copy: ", err))
  }

  const handleDownloadDiff = () => {
    const diffText = diffResult
      .map((line) => {
        const prefix = line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "
        return prefix + line.text
      })
      .join("\n")

    const blob = new Blob([diffText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "text-diff.txt"
    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <GitCompare className="h-6 w-6" />
            Text Diff Viewer
          </CardTitle>
          <CardDescription>Compare two texts and see the differences highlighted similar to GitHub</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Input Text
              </TabsTrigger>
              <TabsTrigger value="diff" className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                View Differences
              </TabsTrigger>
            </TabsList>
            <TabsContent value="input" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Original Text</h3>
                  <Textarea
                    placeholder="Paste original text here..."
                    className="min-h-[300px] font-mono"
                    value={originalText}
                    onChange={(e) => {
                      setOriginalText(e.target.value)
                      setDiffCalculated(false)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Modified Text</h3>
                  <Textarea
                    placeholder="Paste modified text here..."
                    className="min-h-[300px] font-mono"
                    value={modifiedText}
                    onChange={(e) => {
                      setModifiedText(e.target.value)
                      setDiffCalculated(false)
                    }}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleCompare}>
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare Texts
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="diff" className="mt-4">
              <div className="border rounded-md overflow-hidden">
                {diffResult.length === 0 ? (
                  <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                    No differences found or no text to compare
                  </div>
                ) : (
                  <div ref={parentRef} className="h-[500px] overflow-auto p-4 font-mono text-sm bg-muted">
                    {/* Total size container */}
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {/* Virtualized items */}
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const line = diffResult[virtualRow.index]
                        return (
                          <div
                            key={virtualRow.index}
                            data-index={virtualRow.index}
                            className={`absolute left-0 w-full py-1 ${
                              line.type === "added"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : line.type === "removed"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : ""
                            }`}
                            style={{
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <span className="inline-block w-6 text-muted-foreground">
                              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                            </span>
                            <span className="whitespace-pre-wrap">{line.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={handleCopyDiff}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Diff
                </Button>
                <Button variant="outline" onClick={handleDownloadDiff}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Diff
                </Button>
                <Button onClick={() => setActiveTab("input")}>Back to Input</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

