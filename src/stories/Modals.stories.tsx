import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ReissueConfirmModal } from '../components/ReissueConfirmModal'
import { EnlargedTicketModal } from '../components/EnlargedTicketModal'
import { departurePreview } from '../fixtures/departurePreview'
const meta = {
  title: '모달/재발급 확인',
  component: ReissueConfirmModal,
  args: {
    open: true,
    currentCountry: '일본',
    status: 'idle',
    onClose: fn(),
    onConfirm: fn(),
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'loading', 'error', 'unavailable', 'checking-result'],
    },
  },
} satisfies Meta<typeof ReissueConfirmModal>
export default meta
type Story = StoryObj<typeof meta>
export const Confirmation: Story = {}
export const Loading: Story = { args: { status: 'loading' } }
export const NoAlternative: Story = { args: { status: 'unavailable' } }
export const Failure: Story = {
  args: {
    status: 'error',
    error: '연결하지 못했어요. 현재 탑승권과 변경 기회는 유지돼요.',
  },
}
export const CheckingResult: Story = { args: { status: 'checking-result' } }
export const EnlargedTicket: Story = {
  render: (args) => (
    <EnlargedTicketModal
      open={args.open}
      result={departurePreview}
      onClose={args.onClose}
    />
  ),
}
function ModalJourney(args: React.ComponentProps<typeof ReissueConfirmModal>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="min-h-control text-body underline"
        onClick={() => setOpen(true)}
      >
        재발급 확인 열기
      </button>
      <ReissueConfirmModal
        {...args}
        open={open}
        onClose={() => {
          args.onClose()
          setOpen(false)
        }}
      />
    </>
  )
}
export const OpenAndClose: Story = {
  render: (args) => <ModalJourney {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: '재발급 확인 열기' })
    await userEvent.click(trigger)
    await expect(canvas.getByRole('dialog')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /^닫기$/ }))
    await expect(args.onClose).toHaveBeenCalled()
    await expect(trigger).toHaveFocus()
  },
}

export const EnlargedLongName: Story = {
  render: (args) => (
    <EnlargedTicketModal
      open={args.open}
      result={{
        ...departurePreview,
        passengerName: 'JASON ALEXANDER JEONG 함께 여행하는 우리',
      }}
      onClose={args.onClose}
    />
  ),
}
