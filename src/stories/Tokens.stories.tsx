import type { Meta, StoryObj } from '@storybook/react-vite'
const tokens = [
  ['Canvas', 'var(--ui-canvas)'],
  ['Surface', 'var(--ui-surface)'],
  ['Foreground', 'var(--ui-foreground)'],
  ['Ticket', 'var(--ui-ticket)'],
  ['Google blue', 'var(--palette-google-blue)'],
  ['Google red', 'var(--palette-google-red)'],
  ['Google yellow', 'var(--palette-google-yellow)'],
  ['Google green', 'var(--palette-google-green)'],
]
function Tokens() {
  return (
    <section>
      <h1 className="text-title font-semibold">GDG HOME COMING 디자인 토큰</h1>
      <p className="mt-3 text-body text-muted">
        제품과 동일한 charcoal, ivory, Google 4색 및 공항 모노 타입입니다.
      </p>
      <dl className="mt-8 grid gap-4">
        {tokens.map(([name, color]) => (
          <div key={name} className="flex items-center gap-4">
            <span
              aria-hidden="true"
              style={{
                background: color,
                border: '1px solid var(--ui-border)',
                width: 48,
                height: 36,
              }}
            />
            <dt>{name}</dt>
            <dd className="sr-only">{color}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 font-mono text-title">JASON JEONG · ICN → NRT</p>
    </section>
  )
}
const meta = { title: '기준/디자인 토큰', component: Tokens } satisfies Meta<
  typeof Tokens
>
export default meta
export const PaletteAndType: StoryObj<typeof meta> = {}
