import { useLocalStorage, useMeasure } from '@uidotdev/usehooks'
import { diffLines } from 'diff'
import {
  CircleMinusIcon,
  SettingsIcon,
  WrapTextIcon
} from 'lucide-react'
import { Dispatch, Fragment, SetStateAction, useDeferredValue } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '~/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
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

type DiffSettings = {
  ignoreWhitespace: boolean
  wrapLines: boolean
}
const defaultDiffSettings: DiffSettings = {
  ignoreWhitespace: false,
  wrapLines: false,
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

type DiffSettingsProps = Readonly<{
  diffSettings: DiffSettings
  setDiffSettings: Dispatch<SetStateAction<DiffSettings>>
}>

function DiffSettingsMenu(props: DiffSettingsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" alignOffset={0}>
        <DropdownMenuLabel className="flex items-center gap-2">
          Diff Settings
        </DropdownMenuLabel>
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
          Ignore Whitespace
          <CircleMinusIcon />
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
