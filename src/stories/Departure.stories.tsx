import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  DepartureReveal,
  type DepartureResult,
} from '../components/DepartureReveal'
import { OrientationPrompt } from '../components/OrientationPrompt'
import { TicketIssuer } from '../components/TicketIssuer'
import { departurePreview } from '../fixtures/departurePreview'
import { createRollingPlan, rollingStateAt } from '../hooks/orderedWheel'
import { useDepartureReveal } from '../hooks/useDepartureReveal'
import { PRINT_DURATION } from '../hooks/departureFlow'

const plan = createRollingPlan(departurePreview)
const meta = {
  title: '기계/실제 순차 플립',
  component: DepartureReveal,
  parameters: { canvasMaxWidth: 960 },
  globals: { viewport: { value: 'landscape844', isRotated: false } },
  args: {
    result: departurePreview,
    phase: 'ready',
    rolling: rollingStateAt(plan, plan.readyAt, 1, true),
    onConfirm: fn(),
    reducedMotion: false,
  },
  argTypes: {
    phase: {
      control: 'select',
      options: ['anticipation', 'country', 'details', 'ready'],
    },
  },
} satisfies Meta<typeof DepartureReveal>
export default meta
type Story = StoryObj<typeof meta>
function LiveJourney() {
  const state = useDepartureReveal(departurePreview)
  return state.needsOrientation ? (
    <OrientationPrompt />
  ) : state.flow.screen === 'reveal' ? (
    <DepartureReveal
      result={departurePreview}
      phase={state.flow.phase}
      rolling={state.rolling}
      reducedMotion={state.reducedMotion}
      onConfirm={state.confirm}
    />
  ) : state.flow.screen === 'issuer' ? (
    <div className="mx-auto w-full max-w-[960px]">
      <TicketIssuer
        result={departurePreview}
        phase={state.flow.phase}
        printDurationMs={PRINT_DURATION}
        reducedMotion={state.reducedMotion}
      />
    </div>
  ) : null
}
export const OrderedAToZ: Story = {
  render: () => <LiveJourney />,
  parameters: {
    docs: {
      description: {
        story:
          '실제 useDepartureReveal과 orderedWheel 계획을 재사용합니다. 재실행은 Storybook의 Remount로 합니다. 세로에서는 회전 안내와 함께 국가 공개가 일시 정지됩니다. 가로 전환 후 국가가 단독 공개되고 실제 650ms 배치 이동으로 상단 열 제목과 한 줄 연속 데이터 보드의 국가 열에 자리합니다. 확인하면 같은 가로 화면의 왼쪽 발권기에서 정방향 티켓이 오른쪽으로 출력됩니다. OS 동작 줄이기 환경을 감지합니다.',
      },
    },
  },
}
export const LivePortraitOrientation: Story = {
  render: () => <LiveJourney />,
  globals: { viewport: { value: 'mobile390', isRotated: false } },
}
export const SettledAwaitingConfirmation: Story = {}
export const ReducedMotion: Story = {
  args: { reducedMotion: true },
  globals: { reducedMotion: true },
}
/** Frozen snapshots consume the real rolling plan; only the pre-roll frame is blanked. */
function snapshotArgs(
  result: DepartureResult,
  phase: 'anticipation' | 'country' | 'details' | 'ready',
  elapsed?: number,
) {
  const resultPlan = createRollingPlan(result)
  const at = elapsed ?? resultPlan.readyAt
  return { result, phase, rolling: rollingStateAt(resultPlan, at, 1) }
}
const blankRolling = rollingStateAt(plan, 0, 1)
for (const row of ['country', 'passenger', 'airport', 'gate'] as const) {
  blankRolling[row] = blankRolling[row].map((cell) => ({
    ...cell,
    current: ' ',
    next: ' ',
    isFlipping: false,
    durationMs: 0,
    elapsedMs: 0,
  }))
}
export const InitialBlankPanel: Story = {
  args: { phase: 'anticipation', rolling: blankRolling },
}
export const CountrySettledPanel: Story = {
  args: snapshotArgs(departurePreview, 'country', plan.countryEnd),
}
export const InformationRevealingPanel: Story = {
  args: snapshotArgs(departurePreview, 'details', plan.timeline[2].at + 800),
}
export const ShortCountryAndPassenger: Story = {
  args: snapshotArgs(
    {
      ...departurePreview,
      country: 'USA',
      countryLabel: '미국',
      city: 'NEW YORK / JFK',
      airportCode: 'JFK',
      passengerName: 'A B',
    },
    'ready',
  ),
}
export const LongCountryAndPassenger: Story = {
  args: snapshotArgs(
    {
      ...departurePreview,
      country: 'UNITED KINGDOM',
      countryLabel: '영국',
      passengerName: 'JASON ALEXANDER JEONG 함께 여행하는 우리',
      city: 'LONDON / HEATHROW',
      airportCode: 'LHR',
    },
    'ready',
  ),
  globals: { viewport: { value: 'landscape667', isRotated: false } },
}
export const LongSingleWordCountry: Story = {
  args: snapshotArgs(
    {
      ...departurePreview,
      country: 'AUSTRALIA',
      countryLabel: '호주',
      city: 'SYDNEY',
      airportCode: 'SYD',
    },
    'ready',
  ),
  globals: { viewport: { value: 'landscape667', isRotated: false } },
}
export const UnicodePassenger: Story = {
  args: snapshotArgs(
    { ...departurePreview, passengerName: 'JOSÉ e\u0301 👩🏽‍✈️ 가족 👨‍👩‍👧‍👦' },
    'ready',
  ),
  globals: { viewport: { value: 'landscape844', isRotated: false } },
}
export const PortraitPrinting: Story = {
  parameters: { canvasMaxWidth: 960 },
  render: (args) => (
    <TicketIssuer
      result={args.result}
      reducedMotion={args.reducedMotion}
      phase="printing"
      printDurationMs={PRINT_DURATION}
    />
  ),
  globals: { viewport: { value: 'landscape844', isRotated: false } },
}
export const PortraitPrintingLongName: Story = {
  ...PortraitPrinting,
  args: {
    result: {
      ...departurePreview,
      passengerName: 'JASON ALEXANDER JEONG 함께 여행하는 우리',
    },
  },
  globals: { viewport: { value: 'landscape667', isRotated: false } },
}
export const ReducedMotionPrinting: Story = {
  parameters: { canvasMaxWidth: 960 },
  render: (args) => (
    <TicketIssuer
      result={args.result}
      reducedMotion
      phase="printing"
      printDurationMs={PRINT_DURATION}
    />
  ),
  globals: {
    viewport: { value: 'landscape667', isRotated: false },
    reducedMotion: true,
  },
}
export const Complete: Story = {
  parameters: { canvasMaxWidth: 960 },
  globals: { viewport: { value: 'landscape844', isRotated: false } },
  render: (args) => (
    <TicketIssuer
      result={args.result}
      reducedMotion={args.reducedMotion}
      phase="complete"
      onContinue={fn()}
      printDurationMs={PRINT_DURATION}
    />
  ),
}
