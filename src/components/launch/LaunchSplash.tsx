import { Spinner } from '../ui'

export function LaunchSplash() {
  return (
    <main className="qar:grid qar:min-h-screen qar:place-items-center qar:px-5 qar:py-8" aria-label="Launch restore">
      <section className="qar:grid qar:w-full qar:max-w-sm qar:gap-3 qar:text-center">
        <Spinner label="Opening Al-Fatihah" />
        <h2 className="qar:m-0 qar:text-xl qar:leading-tight">Opening Al-Fatihah</h2>
        <p className="qar:m-0 qar:text-sm qar:text-muted">Preparing the default Qaloon reader.</p>
      </section>
    </main>
  )
}
