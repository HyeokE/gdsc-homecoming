import { useState, type CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  DepartureReveal,
  FlapCell,
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
    userRowIndex: 2,
  },
  argTypes: {
    userRowIndex: { control: { type: 'number', min: 0, step: 1 } },
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
      userRowIndex={state.userRowIndex}
      onRowCapacity={state.setRowCapacity}
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
          '실제 useDepartureReveal과 orderedWheel 계획을 재사용합니다. 재실행은 Storybook의 Remount로 합니다. 세로에서는 회전 안내와 함께 국가 공개가 일시 정지됩니다. 가로 전환 후 국가가 단독 공개되고 실제 650ms 배치 이동으로 상단 열 제목과 연속 데이터 보드의 국가 열에 자리합니다. 화면 높이를 채우는 배경 행은 여러 항공사와 운항 정보를 한두 행씩 순차 플립을 완료한 뒤8~12초 쉬며 갱신합니다. 사용자 일정은 실행 시작 때 정해진 화면 안 행에 고정되며,공개 완료 후 손가락 안내가 가리키는 노란 행을 선택하면 발권 중 로딩을 2초 보여준 뒤 왼쪽의 작은 출력구에서 정방향 티켓이 오른쪽으로 출력됩니다. OS 동작 줄이기 환경을 감지합니다.',
      },
    },
  },
}
export const LivePortraitOrientation: Story = {
  render: () => <LiveJourney />,
  globals: { viewport: { value: 'mobile390', isRotated: false } },
}
export const SettledAwaitingConfirmation: Story = {
  name: '정착한 사용자 행 선택',
  parameters: {
    docs: {
      description: {
        story:
          '공개가 끝난 노란 사용자 행만 선택할 수 있습니다. 사용자 행의 위치는 실행 중 바뀌지 않습니다. 배경 항공편 행은 키보드와 클릭 대상이 아닙니다. 배경의 지속 갱신과 실제 발권 전환은 OrderedAToZ에서 확인합니다.',
      },
    },
  },
}
export const ViewportFilledBoard: Story = {
  globals: { viewport: { value: 'landscape960', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        landscape960: {
          name: '가로 960',
          styles: { width: '960px', height: '600px' },
        },
      },
    },
    docs: {
      description: {
        story:
          '960×600 CSS viewport의 정착 상태입니다. 화면 높이에 맞춘 배경 행의 개수와 overflow를 확인하는 표현 story이며 실제 기기 증거가 아닙니다.',
      },
    },
  },
}
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
      country: 'UK',
      countryLabel: '영국',
      city: 'LONDON / HEATHROW',
      airportCode: 'LHR',
      passengerName: 'A B',
    },
    'ready',
  ),
}
export const LongCountryAndPassenger: Story = {
  args: snapshotArgs(
    {
      ...departurePreview,
      country: 'NEW ZEALAND',
      countryLabel: '뉴질랜드',
      passengerName: 'JASON ALEXANDER JEONG 함께 여행하는 우리',
      city: 'AUCKLAND',
      airportCode: 'AKL',
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
export const PreparingTicket: Story = {
  parameters: { canvasMaxWidth: 960 },
  render: (args) => (
    <TicketIssuer
      result={args.result}
      reducedMotion={args.reducedMotion}
      phase="preparing"
      printDurationMs={PRINT_DURATION}
    />
  ),
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

function SingleFlapMechanism() {
  const [revision, setRevision] = useState(0)
  const [slow, setSlow] = useState(true)
  const durationMs = slow ? 2000 : 110
  return (
    <section aria-label="단일 플랩 기구 검사" className="departure-reveal">
      <p>
        실제 FlapCell의 A → B 전환입니다. 느린 검사는 반판과 글자 마스크를
        관찰하는 용도입니다.
      </p>
      <div
        style={
          {
            width: 100,
            display: 'grid',
            marginBlock: 24,
            '--panel-height': '100px',
            '--panel-font-size': '80px',
            '--panel-cell-width': '100px',
          } as CSSProperties
        }
      >
        <FlapCell
          key={`${revision}-${slow}`}
          reducedMotion={false}
          primary
          cell={{
            current: 'A',
            next: 'B',
            stepId: `inspect-${revision}-${slow}`,
            isFlipping: true,
            durationMs,
            elapsedMs: 0,
          }}
        />
      </div>
      <label>
        <input
          type="checkbox"
          checked={slow}
          onChange={(event) => setSlow(event.target.checked)}
        />{' '}
        2초 느린 검사
      </label>
      <button type="button" onClick={() => setRevision((value) => value + 1)}>
        A → B 다시 실행
      </button>
    </section>
  )
}
export const SingleFlapInspection: Story = {
  render: () => <SingleFlapMechanism />,
  parameters: {
    docs: {
      description: {
        story:
          '제품의 실제 FlapCell을 재사용합니다. 2초 검사는 upper/current와 lower/next의 마스크·힌지 관찰용이며 제품 정상 속도의 육안 검증을 대신하지 않습니다. 체크를 해제하면 기본110ms 단계를 관찰합니다. 프레임 캡처에서 Web Animations currentTime을 고정하면 그 사실을 별도로 기록합니다.',
      },
    },
  },
}
