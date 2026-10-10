import { useState } from 'react';
import { LayoutGroup } from 'motion/react';
import { TicketIssuer } from '../components/TicketIssuer';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
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

function TearToDetailPreview(args: React.ComponentProps<typeof TicketScreen>) {
  const [received, setReceived] = useState(false);
  return (
    <LayoutGroup>
      {received ? (
        <div className="ticket-result-page">
          <TicketScreen {...args} enterFromIssuer />
        </div>
      ) : (
        <TicketIssuer result={args.ticket} phase="complete" printDurationMs={0} onContinue={() => setReceived(true)} />
      )}
    </LayoutGroup>
  );
}

export const TearToDetail: Story = {
  parameters: { canvasMaxWidth: 1000 },
  render: (args) => <TearToDetailPreview {...args} />,
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '탑승권 받기' }));
    canvas.getByRole('button', { name: '오른쪽 탑승권 뜯기' }).focus();
    await userEvent.keyboard('{Enter}');
    const stub = await canvas.findByRole('article', { name: /탑승권 절취 부분$/ });
    const start = stub.getBoundingClientRect();
    const target = stub.closest('.ticket-detail__ticket')!.getBoundingClientRect();
    const reduced = globals.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      // The newly mounted detail piece must start near the torn paper, not jump to its final position.
      await expect(Math.hypot(start.x - target.x, start.y - target.y)).toBeGreaterThan(10);
    }
    await waitFor(
      () => {
        const settled = stub.getBoundingClientRect();
        expect(Math.abs(settled.x - target.x)).toBeLessThan(1);
        expect(Math.abs(settled.y - target.y)).toBeLessThan(1);
        expect(Math.abs(settled.width - target.width)).toBeLessThan(1);
      },
      { timeout: 2000 },
    );
    await expect(canvas.queryByRole('dialog', { name: '탑승권 받기' })).not.toBeInTheDocument();
  },
};
