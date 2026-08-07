import { useSyncExternalStore } from 'react'
import type { Tone } from '../types'

/**
 * Transient confirmations, shown after something has actually happened.
 *
 * Deliberately separate from the confirm-before-you-act prompts: a prompt asks
 * permission, a toast reports the outcome. A destructive action should do both,
 * so the operator knows the thing they authorised really went through.
 */

export interface Toast {
  id: number
  text: string
  tone: Tone
  /** Undo handler, when the action can be taken back. */
  onUndo?: () => void
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useToasts() {
  return useSyncExternalStore(subscribe, () => toasts, () => toasts)
}

export const LIFETIME_MS = 6000

export function notify(text: string, tone: Tone = 'good', onUndo?: () => void) {
  const id = nextId++
  toasts = [...toasts, { id, text, tone, onUndo }]
  emit()
  setTimeout(() => dismiss(id), LIFETIME_MS)
  return id
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}
