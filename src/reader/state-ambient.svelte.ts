export const ambientChrome = $state({
  dockVisible: true,
  pillLabel: '',
  dockFadeTimerHandle: null as ReturnType<typeof setTimeout> | null,
  pillFadeTimerHandle: null as ReturnType<typeof setTimeout> | null,
})
