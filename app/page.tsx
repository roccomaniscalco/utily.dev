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
import { useState } from "react";
import { nanoid } from "nanoid";

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
  const [activeTab, setActiveTab] = useState("input");

  const [originalText, setOriginalText] = useState("");
  const [modifiedText, setModifiedText] = useState("");

  const [diffResult, setDiffResult] = useState<DiffLine[]>([]);
  const diffText = diffResult
    .map((line) => `${line.type} ${line.text}`)
    .join("\n");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleCompare = () => {
    const diff = computeDiff(originalText, modifiedText);
    setDiffResult(diff);
    setActiveTab("diff");
  };

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
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <GitCompare className="h-6 w-6" />
            Text Diff Viewer
          </CardTitle>
          <CardDescription>
            Compare two texts and see the differences highlighted similar to
            GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
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
                    onChange={(e) => setOriginalText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Modified Text</h3>
                  <Textarea
                    placeholder="Paste modified text here..."
                    className="min-h-[300px] font-mono"
                    value={modifiedText}
                    onChange={(e) => setModifiedText(e.target.value)}
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
                  <div className="h-[500px] overflow-auto p-4 font-mono text-sm bg-muted">
                    <pre className="relative w-full">
                      {diffResult.map((line) => (
                        <div
                          className={cn(
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
                <Button onClick={() => setActiveTab("input")}>
                  Back to Input
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
