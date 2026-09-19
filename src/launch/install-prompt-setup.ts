import { readNativeSetting, writeNativeSetting } from '../storage/native-reader-store'

export const INSTALL_PROMPT_SETUP_VERSION = 1

// First-run install CTA disposition: once the user accepts or dismisses the
// popup offer it never returns; the persistent entries (Settings, About)
// remain available.
export async function shouldOfferInstallPrompt(): Promise<boolean> {
  try {
    const marker = await readNativeSetting('installPromptSetupVersion')
    return marker?.value !== INSTALL_PROMPT_SETUP_VERSION
  } catch {
    // Unreadable storage must not nag: skip the popup, keep the entries.
    return false
  }
}

export async function writeInstallPromptResolved(): Promise<void> {
  await writeNativeSetting({ key: 'installPromptSetupVersion', value: INSTALL_PROMPT_SETUP_VERSION })
}
