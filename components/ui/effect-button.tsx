"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { getPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

/**
 * Keyframes ship inside the component via React 19 hoisted <style> —
 * no tailwind config edits, and duplicates dedupe by href.
 */
const KEYFRAMES = `@keyframes eb-shimmer{from{transform:translateX(-100%) skewX(-12deg)}to{transform:translateX(400%) skewX(-12deg)}}
@keyframes eb-glow{0%,100%{box-shadow:0 0 14px 0 color-mix(in oklab,var(--primary) 50%,transparent)}50%{box-shadow:0 0 30px 8px color-mix(in oklab,var(--primary) 68%,transparent)}}
@keyframes eb-ripple{to{transform:translate(-50%,-50%) scale(3);opacity:0}}`

const effectButtonVariants = cva(
  [
    "group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg px-6 py-2.5 text-sm font-medium",
    "transition-all active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      effect: {
        shimmer: "bg-primary text-primary-foreground",
        shine: "bg-primary text-primary-foreground",
        spotlight: "bg-primary text-primary-foreground",
        glow: [
          "bg-primary text-primary-foreground",
          "shadow-[0_0_14px_0_color-mix(in_oklab,var(--primary)_50%,transparent)]",
          "[animation:eb-glow_2.4s_ease-in-out_infinite] motion-reduce:[animation:none]",
        ],
        gradient: [
          "bg-gradient-to-r from-primary via-primary/75 to-primary text-primary-foreground",
          "bg-[length:200%_100%] bg-left transition-[background-position] duration-500 hover:bg-right",
        ],
        glass: [
          "border border-border/60 bg-background/40 text-foreground backdrop-blur-md",
          "hover:bg-background/55",
        ],
        ripple: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { effect: "shimmer" },
  },
)

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

export interface EffectButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof effectButtonVariants> {}

export const EffectButton = React.forwardRef<HTMLButtonElement, EffectButtonProps>(
  (
    { effect = "shimmer", className, children, onClick, onMouseMove, onMouseEnter, onMouseLeave, ...props },
    ref,
  ) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([])
    // Only enter/leave re-renders; the cursor position is written straight to the
    // overlay's CSS variables, so a mousemove never re-renders the button.
    const [spotActive, setSpotActive] = React.useState(false)
    const spotRef = React.useRef<HTMLSpanElement>(null)
    const rippleId = React.useRef(0)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (effect === "ripple" && !getPrefersReducedMotion()) {
        const rect = e.currentTarget.getBoundingClientRect()
        setRipples(prev => [
          ...prev,
          {
            id: rippleId.current++,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            size: Math.max(rect.width, rect.height),
          },
        ])
      }
      onClick?.(e)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const spotlight = spotRef.current
      if (effect === "spotlight" && spotlight) {
        const rect = e.currentTarget.getBoundingClientRect()
        spotlight.style.setProperty("--eb-spot-x", `${e.clientX - rect.left}px`)
        spotlight.style.setProperty("--eb-spot-y", `${e.clientY - rect.top}px`)
      }
      onMouseMove?.(e)
    }

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (effect === "spotlight") setSpotActive(true)
      onMouseEnter?.(e)
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (effect === "spotlight") setSpotActive(false)
      onMouseLeave?.(e)
    }

    return (
      <button
        className={cn(effectButtonVariants({ effect }), className)}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        ref={ref}
        {...props}
      >
        <style href="zyeon-effect-button" precedence="medium">
          {KEYFRAMES}
        </style>

        {effect === "shimmer" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent [animation:eb-shimmer_2.75s_ease-in-out_infinite] motion-reduce:hidden"
          />
        )}

        {effect === "shine" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent transition-transform duration-0 ease-out group-hover:translate-x-[400%] group-hover:duration-700 motion-reduce:hidden"
          />
        )}

        {effect === "spotlight" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:hidden"
            ref={spotRef}
            style={{
              opacity: spotActive ? 1 : 0,
              background:
                "radial-gradient(120px circle at var(--eb-spot-x, 0px) var(--eb-spot-y, 0px), color-mix(in oklab, var(--primary-foreground) 25%, transparent), transparent 40%)",
            }}
          />
        )}

        {effect === "ripple" &&
          ripples.map(r => (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full bg-primary-foreground/30 [animation:eb-ripple_600ms_ease-out_forwards]"
              key={r.id}
              onAnimationEnd={() => setRipples(prev => prev.filter(p => p.id !== r.id))}
              style={{
                left: r.x,
                top: r.y,
                width: r.size,
                height: r.size,
                transform: "translate(-50%, -50%) scale(0)",
              }}
            />
          ))}

        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    )
  },
)

EffectButton.displayName = "EffectButton"

export default EffectButton
