import { useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'
import App from '../App'
import { DEMO_STORAGE_KEY } from '../services/demoTicketService'

let restoreDemoStorage = () => {}

function RouteReadback() {
  const location = useLocation()
  return <output aria-label="현재 경로">{location.pathname}</output>
}
function AppRegression() {
  const [mount, setMount] = useState(0)
  return (
    <>
      <button onClick={() => setMount((value) => value + 1)}>
        앱 새로 마운트
      </button>
      <MemoryRouter key={mount} initialEntries={['/']}>
        <RouteReadback />
        <App />
      </MemoryRouter>
    </>
  )
}
const meta = {
  title: '흐름/데모 발권 회귀',
  component: AppRegression,
  tags: ['!autodocs'],
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: {
    docs: {
      description: {
        component:
          '제품 App의 라우팅과 복원을 검사합니다. 이 Storybook origin의 두 데모 저장 키만 잠시 초기화하고 종료 즉시 복구합니다. 실제 행사 자료가 아닙니다.',
      },
    },
  },
  beforeEach: () => {
    const previousLocal = localStorage.getItem(DEMO_STORAGE_KEY)
    const previousSession = sessionStorage.getItem('gdg-demo-participant')
    localStorage.removeItem(DEMO_STORAGE_KEY)
    sessionStorage.removeItem('gdg-demo-participant')
    restoreDemoStorage = () => {
      if (previousLocal === null) localStorage.removeItem(DEMO_STORAGE_KEY)
      else localStorage.setItem(DEMO_STORAGE_KEY, previousLocal)
      if (previousSession === null)
        sessionStorage.removeItem('gdg-demo-participant')
      else sessionStorage.setItem('gdg-demo-participant', previousSession)
    }
    return restoreDemoStorage
  },
} satisfies Meta<typeof AppRegression>
export default meta
export const IssueThenRestore: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    try {
      await userEvent.click(
        await canvas.findByRole('button', { name: '발권하기' }),
      )
      const email = await canvas.findByRole('textbox', {
        name: '신청한 이메일',
      })
      fireEvent.change(email, { target: { value: 'demo@gdg.example' } })
      await expect(email).toHaveValue('demo@gdg.example')
      await userEvent.click(canvas.getByRole('button', { name: '확인하기' }))
      const nickname = await canvas.findByRole('textbox', {
        name: '닉네임 + 성',
      })
      fireEvent.change(nickname, { target: { value: 'JASON JEONG' } })
      await expect(nickname).toHaveValue('JASON JEONG')
      await userEvent.click(canvas.getByRole('button', { name: '발권하기' }))
      await waitFor(() =>
        expect(canvas.getByLabelText('현재 경로')).toHaveTextContent(
          '/departure',
        ),
      )
      await expect(
        canvas.queryByRole('region', { name: 'GDG AIR' }),
      ).not.toBeInTheDocument()
      const confirm = await canvas.findByRole(
        'button',
        { name: '확인했어요' },
        { timeout: 12000 },
      )
      await expect(canvas.getByLabelText('현재 경로')).toHaveTextContent(
        '/departure',
      )
      await expect(confirm).toBeEnabled()
      await expect(
        canvas.queryByRole('region', { name: 'GDG AIR' }),
      ).not.toBeInTheDocument()
      await userEvent.click(
        canvas.getByRole('button', { name: '앱 새로 마운트' }),
      )
      await waitFor(() =>
        expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/ticket'),
      )
      await expect(
        canvas.getByRole('heading', { name: '당신의 탑승권' }),
      ).toBeVisible()
    } finally {
      restoreDemoStorage()
    }
  },
}

/** Manual Aside QA of live portrait confirmation/printing; teardown restores storage. */
export const ManualPortraitPrinting: StoryObj<typeof meta> = {}
