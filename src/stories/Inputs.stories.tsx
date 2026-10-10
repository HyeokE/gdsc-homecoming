import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { EmailScreen } from '../components/screens/EmailScreen'
import { NicknameScreen } from '../components/screens/NicknameScreen'

const meta = {
  title: '화면/이메일 참가 확인',
  component: EmailScreen,
  args: {
    value: '',
    demoEmail: 'demo@gdg.example',
    onChange: fn(),
    onSubmit: fn(),
    onBack: fn(),
    status: 'idle',
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'loading', 'checking-result'],
    },
  },
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    useEffect(() => setValue(args.value), [args.value])
    return (
      <EmailScreen
        {...args}
        value={value}
        onChange={(value) => {
          args.onChange(value)
          setValue(value)
        }}
      />
    )
  },
} satisfies Meta<typeof EmailScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Initial: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox')
    await userEvent.type(input, 'demo@gdg.example', { delay: 30 })
    await expect(input).toHaveValue('demo@gdg.example')
    await userEvent.click(canvas.getByRole('button', { name: '확인하기' }))
    await expect(args.onSubmit).toHaveBeenCalled()
  },
}
export const FormatError: Story = {
  args: {
    value: 'invalid',
    error: { kind: 'field', message: '이메일 형식을 확인해주세요.' },
  },
}
export const NotRegistered: Story = {
  args: {
    value: 'unknown@gdg.example',
    error: { kind: 'not-found', message: '신청 내역을 찾을 수 없어요.' },
  },
}
export const ConnectionFailure: Story = {
  args: {
    value: 'demo@gdg.example',
    error: {
      kind: 'connection',
      message: '연결하지 못했어요. 다시 시도해주세요.',
    },
  },
}
export const Loading: Story = {
  args: { value: 'demo@gdg.example', status: 'loading' },
}
export const CheckingExistingResult: Story = {
  args: { value: 'demo@gdg.example', status: 'checking-result' },
}
export const NicknameInitial: Story = {
  name: '닉네임 / 초기',
  render: (args) => (
    <NicknameScreen
      value={args.value}
      onChange={args.onChange}
      onSubmit={args.onSubmit}
      onBack={args.onBack}
      status={args.status}
      error={args.error}
      disabled={args.disabled}
    />
  ),
}
export const NicknameEmpty: Story = {
  name: '닉네임 / 빈 값',
  args: { error: { kind: 'field', message: '닉네임을 입력해주세요.' } },
  render: (args) => (
    <NicknameScreen
      value={args.value}
      onChange={args.onChange}
      onSubmit={args.onSubmit}
      onBack={args.onBack}
      status={args.status}
      error={args.error}
      disabled={args.disabled}
    />
  ),
}
export const NicknameLong: Story = {
  name: '닉네임 / 긴 이름',
  args: { value: 'JASON ALEXANDER JEONG 함께 여행하는 우리' },
  render: (args) => (
    <NicknameScreen
      value={args.value}
      onChange={args.onChange}
      onSubmit={args.onSubmit}
      onBack={args.onBack}
      status={args.status}
      error={args.error}
      disabled={args.disabled}
    />
  ),
}
export const NicknameLoading: Story = {
  name: '닉네임 / 발권 중',
  args: { value: 'JASON JEONG', status: 'loading' },
  render: (args) => (
    <NicknameScreen
      value={args.value}
      onChange={args.onChange}
      onSubmit={args.onSubmit}
      onBack={args.onBack}
      status={args.status}
      error={args.error}
      disabled={args.disabled}
    />
  ),
}
