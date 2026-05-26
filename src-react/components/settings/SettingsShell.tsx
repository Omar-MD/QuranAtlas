import type { ReactNode } from 'react'

import { SettingsPageRecipe } from '../../design-system/recipes/settings-page'

export function SettingsShell({ children, title = 'Settings' }: { children: ReactNode; title?: string }) {
  return <SettingsPageRecipe title={title}>{children}</SettingsPageRecipe>
}
