import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { LandingScreen } from '../components/screens/LandingScreen'
const meta = {
  title: '화면/행사 입장',
  component: LandingScreen,
  args: { onStart: fn() },
} satisfies Meta<typeof LandingScreen>
export default meta
export const Landing: StoryObj<typeof meta> = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '발권하기' }))
    await expect(args.onStart).toHaveBeenCalled()
    await expect(
      canvas.getByRole('link', { name: /문의하기/ }),
    ).toHaveAttribute('href', 'https://open.kakao.com/o/gvuQCBRi')
  },
}
