"use client"

import * as React from "react"

/** The one media query this hook exists for. Fixed — that is the whole point. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

/**
 * Lazily created once, then shared by every caller.
 *
 * `window.matchMedia()` mints a **new** `MediaQueryList` on every call, and
 * `getSnapshot` runs on every render of every subscribed component. Calling it
 * inline would allocate one object per component per render — on a page where
 * thirty components each gate their own animation, for nothing. One instance,
 * N listeners attached to it, is the cheap shape, and it also keeps
 * `getSnapshot` free of the "returns a new object every time" trap that makes
 * `useSyncExternalStore` loop forever (here the snapshot is a boolean, so it
 * compares by value regardless — but the allocation was still real).
 */
let mediaQueryList: MediaQueryList | null = null

function getMediaQueryList(): MediaQueryList | null {
  // Two different absences, one answer. `typeof window === "undefined"` is the
  // server; a `window` without `matchMedia` is an old WebView or a test
  // environment with no polyfill. Both are read as "no preference expressed",
  // which is the same value this hook reports during server rendering.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null
  mediaQueryList ??= window.matchMedia(REDUCED_MOTION_QUERY)
  return mediaQueryList
}

/**
 * The `subscribe` half of the store. Declared at module scope on purpose: its
 * identity never changes, so `useSyncExternalStore` never tears the
 * subscription down and rebuilds it. A `useCallback` inside the hook would be
 * equivalent but would imply there is something to depend on — there isn't, the
 * query is a constant.
 */
function subscribe(onStoreChange: () => void): () => void {
  const mql = getMediaQueryList()
  if (!mql) return () => {}
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot(): boolean {
  return getMediaQueryList()?.matches ?? false
}

/**
 * The server's answer is a deliberate `false` — "motion allowed".
 *
 * The server has no OS to ask, so it has to guess, and the two guesses fail
 * differently. Guessing `true` renders the static variant into the HTML for
 * *everyone*, so every visitor's first paint is the reduced version and
 * hydration then pops it into motion — a flash of the wrong branch for the
 * majority. Guessing `false` matches the majority, keeps the server HTML
 * identical to the first client render (no hydration mismatch), and costs the
 * minority at most the frame between hydration and the store's first real read.
 * The pure-CSS half of the problem is already correct at first paint for them
 * anyway: `@media (prefers-reduced-motion: reduce)` — Tailwind's
 * `motion-reduce:` variant — needs no JavaScript at all. Reach for this hook
 * only for the half CSS cannot switch off: rAF loops, intervals, autoplay.
 */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Read the preference **once, without subscribing** — for imperative code that
 * runs outside render: a click handler deciding whether to fire a confetti
 * burst, a toast helper picking its enter animation, a canvas routine started
 * from an event. Safe on the server (returns `false`), and it never re-renders
 * anything, which is exactly why it is separate from the hook: a component that
 * only consults the preference inside handlers has no reason to re-render when
 * the OS setting flips.
 */
export function getPrefersReducedMotion(): boolean {
  return getSnapshot()
}

/**
 * Whether the user has asked the system to reduce motion — as a boolean that
 * stays true to the OS setting for the component's whole life.
 *
 * Built on `useSyncExternalStore` rather than `useEffect` + `useState`, because
 * `matchMedia` is the textbook external mutable source: it changes outside
 * React's render cycle (the user flips the setting in System Settings, or an
 * automation does at sunset) and it has to be read tear-free under concurrent
 * rendering. React gets the three primitives — subscribe, client snapshot,
 * server snapshot — and decides itself when to re-render. There is no effect
 * body calling `setState`, and therefore no double render on mount and no
 * window where the rendered value disagrees with the live media query.
 *
 * What the value means for a consumer, in order of how often it is got wrong:
 *
 * 1. **`true` is not "no feedback"** — it is "no *movement*". Replace the
 *    journey, keep the destination: a count-up commits its final number, a
 *    slide-in appears in place, a spinner becomes a static "Loading…". Deleting
 *    the feedback entirely leaves the reduced-motion user with a UI that seems
 *    not to respond.
 * 2. **It can flip mid-session.** The OS setting is live and this hook re-renders
 *    on it, so anything the value gates must be able to stop: put `reduced` in
 *    the dependency array of the effect that owns the rAF loop / interval /
 *    observer, and cancel in that effect's cleanup. An animation started while
 *    the value was `false` must die when it becomes `true`.
 * 3. **CSS first.** If a transition or keyframe animation can express it, write
 *    `motion-reduce:transition-none` / `motion-reduce:animate-none` instead:
 *    that branch is already correct on the first server-rendered paint, with no
 *    hydration and no JavaScript. This hook is for the decisions CSS cannot
 *    reach — whether to *start* a loop, a timer, an autoplay, a physics
 *    simulation.
 *
 * Every caller shares a single `MediaQueryList`; the per-component cost is one
 * `change` listener, removed on unmount by the subscription's own cleanup.
 */
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export default usePrefersReducedMotion
