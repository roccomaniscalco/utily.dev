import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

import { cn } from '~/lib/utils'

function ScrollArea({
  className,
  children,
  horizontalScrollOffset,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  horizontalScrollOffset?: number | null
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      scrollHideDelay={0}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full scroll-pt-10 scroll-pr-10 scroll-pb-10 outline-none [&>div]:size-full"
        style={{ scrollPaddingLeft: horizontalScrollOffset ?? undefined }}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" offset={horizontalScrollOffset} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  offset,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
  offset?: number | null
}) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none transition-colors select-none',
        orientation === 'vertical' &&
          'h-full w-4 border-l border-l-transparent',
        orientation === 'horizontal' &&
          'h-4 flex-col border-t border-t-transparent',
        className,
      )}
      style={{ paddingLeft: offset ?? undefined }}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
