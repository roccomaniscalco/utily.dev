"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as Diff from "diff";
import { Copy, Download, FileText, GitCompare } from "lucide-react";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type DiffLine = {
  type: "+" | "-" | " ";
  text: string;
  id: string;
};

// Using the diff library to compute differences
function computeDiff(originalText: string, modifiedText: string) {
  const diff = Diff.diffLines(originalText, modifiedText);
  return diff
    .map((part) => ({
      type: part.added ? "+" : part.removed ? "-" : (" " as DiffLine["type"]),
      lines: part.value.replace(/\n$/, "").split("\n"),
    }))
    .flatMap((part) =>
      part.lines.map((line) => ({
        id: nanoid(),
        type: part.type,
        text: line,
      }))
    );
}

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useState("");
  const [modifiedText, setModifiedText] = useState("");

  const [diffResult, setDiffResult] = useState<DiffLine[]>([]);
  const diffText = diffResult
    .map((line) => `${line.type} ${line.text}`)
    .join("\n");

  const handleCompare = () => {
    const diff = computeDiff(originalText, modifiedText);
    setDiffResult(diff);
  };

  useEffect(() => {
    handleCompare();
  }, [originalText, modifiedText]);

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(diffText);
  };

  const handleDownloadDiff = () => {
    const blob = new Blob([diffText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "text-diff.txt";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto p-6 max-w-full h-dvh">
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="p-3 flex-row justify-between border-b border-secondary">
          <CardTitle className="text-md font-medium flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Text Diff Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel>
              <Textarea
                placeholder="Original text here..."
                className="border-none font-mono resize-none h-full rounded-none"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel>
              <Textarea
                placeholder="Modified text here..."
                className="border-none font-mono resize-none h-full rounded-none"
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="bg-neutral-900/50 relative group">
              <div className="absolute top-0 right-0 z-10 flex gap-2 p-2">
                <Button
                  variant="outline"
                  className="p-3 opacity-0 focus-visible::opacity-100 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopyDiff}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="p-3 opacity-0 focus-visible::opacity-100 group-hover:opacity-100 transition-opacity"
                  onClick={handleDownloadDiff}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute inset-0 overflow-auto">
                {diffResult.length === 0 && (
                  <p className="text-sm text-muted-foreground font-mono h-full flex items-center justify-center">
                    No text to compare
                  </p>
                )}
                <pre className="md:text-sm py-2">
                  {diffResult.map((line) => (
                    <div
                      className={cn(
                        "w-fit px-2 min-w-full",
                        line.type === "+" && "bg-green-950 text-green-100",
                        line.type === "-" && "bg-red-950 text-red-100"
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
  );
}
