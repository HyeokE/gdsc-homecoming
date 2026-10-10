import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TestAccountChip } from './TestAccountChip';

const meta = {
  title: '티켓/테스트 계정',
  component: TestAccountChip,
  args: { onReset: fn() },
} satisfies Meta<typeof TestAccountChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmation: Story = {};
export const CancelThenReset: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByRole('button', { name: '테스트 데이터 관리' });
    await userEvent.click(chip);
    const dialog = within(canvas.getByRole('dialog', { name: '테스트 데이터 초기화' }));
    await userEvent.click(dialog.getByRole('button', { name: '취소' }));
    await expect(args.onReset).not.toHaveBeenCalled();
    await expect(chip).toHaveFocus();
    await userEvent.click(chip);
    await userEvent.click(dialog.getByRole('button', { name: /^초기화$/ }));
    await expect(args.onReset).toHaveBeenCalledTimes(1);
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
export const StorageFailure: Story = {
  args: {
    onReset: fn(() => {
      throw new Error('storage unavailable');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '테스트 데이터 관리' }));
    const dialog = within(canvas.getByRole('dialog', { name: '테스트 데이터 초기화' }));
    await userEvent.click(dialog.getByRole('button', { name: /^초기화$/ }));
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '취소' })).toBeEnabled();
  },
};
