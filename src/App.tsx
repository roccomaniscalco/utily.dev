import { useLocalStorage, useMeasure } from '@uidotdev/usehooks'
import { Change, diffLines } from 'diff'
import {
  Columns2Icon,
  EyeClosedIcon,
  SettingsIcon,
  SquareIcon,
  WrapTextIcon,
} from 'lucide-react'
import { Dispatch, Fragment, SetStateAction, useDeferredValue } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '~/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
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

function computeDiff(
  originalText: string,
  modifiedText: string,
  options?: { ignoreWhitespace?: boolean },
) {
  const changes = diffLines(originalText, modifiedText, {
    oneChangePerToken: true, // split changes by line instead of by type of change
    ignoreWhitespace: options?.ignoreWhitespace,
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

type SplitDiff = {
  added: number
  removed: number
  rows: {
    original: {
      type: '-' | ' '
      text: string
      lineNumber: number | null
    }
    modified: {
      type: '+' | ' '
      text: string
      lineNumber: number | null
    }
  }[]
}

function computeSplitDiff(
  originalText: string,
  modifiedText: string,
  options?: { ignoreWhitespace?: boolean },
) {
  const changes = diffLines(originalText, modifiedText, {
    ignoreWhitespace: options?.ignoreWhitespace,
  })

  const splitDiff: SplitDiff = { added: 0, removed: 0, rows: [] }
  let originalLineNumber = 0
  let modifiedLineNumber = 0

  let changeIndex = 0
  while (changeIndex < changes.length) {
    const change = changes[changeIndex] as Change
    const changeType = change.added ? '+' : change.removed ? '-' : ' '
    const lines = change.value.replace(/\n$/, '').split('\n')

    // Case 1: Unmodified
    if (changeType === ' ') {
      for (const line of lines) {
        splitDiff.rows.push({
          original: { type: ' ', text: line, lineNumber: ++originalLineNumber },
          modified: { type: ' ', text: line, lineNumber: ++modifiedLineNumber },
        })
      }
      changeIndex++
      continue
    }

    const nextChange = changes[changeIndex + 1]
    const nextChangeType = nextChange?.added
      ? '+'
      : nextChange?.removed
        ? '-'
        : ' '
    const nextChangeLines = nextChange?.value.replace(/\n$/, '').split('\n')

    // Case 2: Added _or_ Removed
    if (changeType === '+' && nextChangeType === ' ') {
      for (const line of lines) {
        splitDiff.rows.push({
          original: { type: ' ', text: '', lineNumber: null },
          modified: { type: '+', text: line, lineNumber: ++originalLineNumber },
        })
      }
      splitDiff.added += lines.length
      changeIndex += 1
      continue
    }
    if (changeType === '-' && nextChangeType === ' ') {
      for (const line of lines) {
        splitDiff.rows.push({
          original: { type: '-', text: line, lineNumber: ++modifiedLineNumber },
          modified: { type: ' ', text: '', lineNumber: null },
        })
      }
      splitDiff.removed += lines.length
      changeIndex += 1
      continue
    }

    const numRows = Math.max(lines.length, nextChangeLines?.length ?? 0)

    // Case 3: Added _and_ Removed (Modification)
    if (changeType === '+' && nextChangeType === '-') {
      for (let i = 0; i < numRows; i++) {
        const line = lines[i] ?? ''
        const lineType = line === undefined ? ' ' : '+'
        const nextLine = nextChangeLines?.[i] ?? ''
        const nextLineType = nextLine === undefined ? ' ' : '-'

        splitDiff.rows.push({
          original: {
            type: nextLineType,
            text: nextLine,
            lineNumber: ++modifiedLineNumber,
          },
          modified: {
            type: lineType,
            text: line,
            lineNumber: ++originalLineNumber,
          },
        })
      }
      splitDiff.added += lines.length
      // @ts-expect-error nextChangeLines should be defined here
      splitDiff.removed += nextChangeLines.length
      changeIndex += 2
      continue
    }
    if (changeType === '-' && nextChangeType === '+') {
      for (let i = 0; i < numRows; i++) {
        const line = lines[i] ?? ''
        const lineType = line === undefined ? ' ' : '-'
        const nextLine = nextChangeLines?.[i] ?? ''
        const nextLineType = nextLine === undefined ? ' ' : '+'

        splitDiff.rows.push({
          original: {
            type: lineType,
            text: line,
            lineNumber: ++originalLineNumber,
          },
          modified: {
            type: nextLineType,
            text: nextLine,
            lineNumber: ++modifiedLineNumber,
          },
        })
      }
      splitDiff.removed += lines.length
      // @ts-expect-error nextChangeLines should be defined here
      splitDiff.added += nextChangeLines.length
      changeIndex += 2
      continue
    }

    throw new Error('Invalid diff state')
  }

  return splitDiff
}

type DiffSettings = {
  ignoreWhitespace: boolean
  wrapLines: boolean
  displayMode: 'unified' | 'split'
}
const defaultDiffSettings: DiffSettings = {
  ignoreWhitespace: false,
  wrapLines: false,
  displayMode: 'unified',
}

export default function TextDiffApp() {
  const [originalText, setOriginalText] = useLocalStorage('originalText', '')
  const [modifiedText, setModifiedText] = useLocalStorage('modifiedText', '')
  const [diffSettings, setDiffSettings] = useLocalStorage(
    'diffSettings',
    defaultDiffSettings,
  )

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
          diffSettings={diffSettings}
          setDiffSettings={setDiffSettings}
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
  diffSettings: DiffSettings
  setDiffSettings: Dispatch<SetStateAction<DiffSettings>>
}>
function Viewer(props: ViewerProps) {
  return {
    unified: <UnifiedViewer {...props} />,
    split: <SplitViewer {...props} />,
  }[props.diffSettings.displayMode]
}

function UnifiedViewer(props: ViewerProps) {
  const diff = computeDiff(props.originalText, props.modifiedText, {
    ignoreWhitespace: props.diffSettings.ignoreWhitespace,
  })

  const [lineNumbersRef, { width: lineNumbersWidth }] = useMeasure()

  return (
    <Card className="size-full">
      <CardHeader>
        <CardTitle>Difference</CardTitle>
        <CardAction>
          <div className="flex items-center gap-1.5 text-sm tabular-nums">
            <p className="text-term-green">+{diff.added}</p>
            <p className="text-muted-foreground">/</p>
            <p className="text-term-red">-{diff.removed}</p>
          </div>
          <DiffSettingsMenu
            diffSettings={props.diffSettings}
            setDiffSettings={props.setDiffSettings}
          />
        </CardAction>
      </CardHeader>
      <ScrollArea
        className="min-h-0 flex-1"
        horizontalScrollOffset={lineNumbersWidth}
      >
        <div className="grid min-h-full flex-1 grid-cols-[min-content_1fr] content-start">
          {diff.lines.map((line, index) => (
            <Fragment key={index}>
              <div
                className="bg-card text-muted-foreground sticky left-0 grid grid-cols-[1fr_1fr] gap-2 px-3 text-end font-mono text-sm leading-5 select-none"
                ref={index === 0 ? lineNumbersRef : undefined}
              >
                <span>{line.originalLine}</span>
                <span>{line.modifiedLine}</span>
              </div>
              <pre
                className={cn(
                  'font-mono text-sm leading-5',
                  props.diffSettings.wrapLines
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

function SplitViewer(props: ViewerProps) {
  const diff = computeSplitDiff(props.originalText, props.modifiedText, {
    ignoreWhitespace: props.diffSettings.ignoreWhitespace,
  })

  return (
    <Card className="size-full">
      <CardHeader>
        <CardTitle>Difference</CardTitle>
        <CardAction>
          <div className="flex items-center gap-1.5 text-sm tabular-nums">
            <p className="text-term-green">+{diff.added}</p>
            <p className="text-muted-foreground">/</p>
            <p className="text-term-red">-{diff.removed}</p>
          </div>
          <DiffSettingsMenu
            diffSettings={props.diffSettings}
            setDiffSettings={props.setDiffSettings}
          />
        </CardAction>
      </CardHeader>
      <ScrollArea
        className="min-h-0 flex-1"
        // horizontalScrollOffset={lineNumbersWidth}
      >
        <div className="grid min-h-full flex-1 grid-cols-[min-content_1fr_min-content_1fr] content-start">
          {diff.rows.map((row, index) => (
            <Fragment key={index}>
              <div
                className="bg-card text-muted-foreground sticky left-0 grid grid-cols-[1fr_1fr] gap-2 px-3 text-end font-mono text-sm leading-5 select-none"
                // ref={index === 0 ? lineNumbersRef : undefined}
              >
                <span>{row.original.lineNumber}</span>
              </div>
              <pre
                className={cn(
                  'font-mono text-sm leading-5',
                  props.diffSettings.wrapLines
                    ? 'break-all whitespace-pre-wrap'
                    : 'pr-10',
                  row.original.type === '-' && 'text-term-red bg-term-red/5',
                )}
              >
                {row.original.type} {row.original.text}
              </pre>
              <div
                className="bg-card text-muted-foreground sticky left-0 grid grid-cols-[1fr_1fr] gap-2 px-3 text-end font-mono text-sm leading-5 select-none"
                // ref={index === 0 ? lineNumbersRef : undefined}
              >
                <span>{row.modified.lineNumber}</span>
              </div>
              <pre
                className={cn(
                  'font-mono text-sm leading-5',
                  props.diffSettings.wrapLines
                    ? 'break-all whitespace-pre-wrap'
                    : 'pr-10',
                  row.modified.type === '+' &&
                    'text-term-green bg-term-green/5',
                )}
              >
                {row.modified.type} {row.modified.text}
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

type DiffSettingsMenuProps = Readonly<{
  diffSettings: DiffSettings
  setDiffSettings: Dispatch<SetStateAction<DiffSettings>>
}>

function DiffSettingsMenu(props: DiffSettingsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        alignOffset={-9}
        sideOffset={6}
        className="rounded-tr-none"
      >
        <DropdownMenuRadioGroup value={props.diffSettings.displayMode}>
          <DropdownMenuRadioItem
            value="unified"
            onSelect={() =>
              props.setDiffSettings((prev) => ({
                ...prev,
                displayMode: 'unified',
              }))
            }
          >
            Unified
            <SquareIcon />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="split"
            onSelect={() => {
              props.setDiffSettings((prev) => ({
                ...prev,
                displayMode: 'split',
              }))
            }}
          >
            Split
            <Columns2Icon />
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={props.diffSettings.wrapLines}
          onCheckedChange={(checked) =>
            props.setDiffSettings((prev) => ({
              ...prev,
              wrapLines: checked,
            }))
          }
        >
          Wrap Text
          <WrapTextIcon />
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={props.diffSettings.ignoreWhitespace}
          onCheckedChange={(checked) =>
            props.setDiffSettings((prev) => ({
              ...prev,
              ignoreWhitespace: checked,
            }))
          }
        >
          Hide Whitespace
          <EyeClosedIcon />
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
