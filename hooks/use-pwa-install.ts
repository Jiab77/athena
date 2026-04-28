'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * BeforeInstallPromptEvent is non-standard but supported by Chromium browsers.
 * Not declared in lib.dom.d.ts so we type it locally.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * usePWAInstall — exposes a custom install flow for the PWA.
 *
 * - Captures the `beforeinstallprompt` event when the browser deems the app
 *   installable, and prevents the default mini-infobar.
 * - Returns `canInstall` (true when an install prompt is available) and
 *   `install()` to trigger the native prompt on demand.
 * - Listens for `appinstalled` to clear the prompt after a successful install.
 *
 * The `beforeinstallprompt` event is not supported on iOS Safari — `canInstall`
 * will remain false there, which is the correct behavior (iOS users must use
 * the Share menu manually to add the app to the home screen).
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the browser's default mini-infobar
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      // Once installed, the deferred prompt is no longer usable
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    // The deferred prompt can only be used once — clear it regardless of outcome
    setDeferredPrompt(null)

    return outcome
  }, [deferredPrompt])

  return {
    canInstall: deferredPrompt !== null,
    install,
  }
}
