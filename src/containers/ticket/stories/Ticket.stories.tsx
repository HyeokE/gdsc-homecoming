import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TicketScreen } from '../components/screens/TicketScreen';
import { departurePreview } from '../fixtures/departurePreview';
import { destinations } from '../constants/destinations';
import type { DemoTicket } from '../types/ticket';
const ticket: DemoTicket = {
  ...departurePreview,
  id: 'storybook-ticket',
  destinationId: 'jp',
  issuedAt: Date.UTC(2026, 10, 21),
  reissueUsed: false,
  revision: 0,
};
const destination = destinations.find((item) => item.id === 'jp')!;
const meta = {
  title: '화면/탑승권',
  component: TicketScreen,
  args: {
    ticket,
    destination,
    companionStatus: 'ready',
    companionCount: 1,
    reissueStatus: 'available',
    onSave: fn(),
    onEnlarge: fn(),
    onReplay: fn(),
    onCompanionRetry: fn(),
    onReissueRequest: fn(),
  },
  argTypes: {
    saveStatus: {
      control: 'select',
      options: ['idle', 'saving', 'success', 'error'],
    },
    companionStatus: {
      control: 'select',
      options: ['loading', 'ready', 'error'],
    },
    reissueStatus: {
      control: 'select',
      options: ['available', 'loading', 'used', 'unavailable', 'error', 'checking-result'],
    },
  },
} satisfies Meta<typeof TicketScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReissueAvailable: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '조각 티켓 저장' }));
    await expect(args.onSave).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: '탑승권 3D로 보기' }));
    await expect(args.onEnlarge).toHaveBeenCalled();
  },
};
export const LongName: Story = {
  args: {
    ticket: {
      ...ticket,
      passengerName: 'JASON ALEXANDER JEONG 함께 여행하는 우리',
    },
  },
};
export const Saving: Story = { args: { saveStatus: 'saving' } };
export const SaveFailure: Story = {
  args: {
    saveStatus: 'error',
    saveError: '이미지를 만들지 못했어요. 다시 시도해주세요.',
  },
};
export const NoCompanions: Story = { args: { companionCount: 1 } };
export const CompanionLookupFailure: Story = {
  args: { companionStatus: 'error' },
};
export const ReissueUsed: Story = {
  args: {
    ticket: { ...ticket, reissueUsed: true, revision: 1 },
    reissueStatus: 'used',
  },
};
export const NoAlternative: Story = { args: { reissueStatus: 'unavailable' } };
export const RestoringResult: Story = {
  args: { reissueStatus: 'checking-result' },
};
