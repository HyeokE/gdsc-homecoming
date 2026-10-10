import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BoardingPass, type BoardingPassProps } from '../components/BoardingPass';
import { EnlargedTicketModal } from '../components/EnlargedTicketModal';
import { primaryButtonClass, secondaryButtonClass } from '@/components/common/buttonClasses';
import { getDestination } from '../constants/destinations';
import { departurePreview } from '../fixtures/departurePreview';
import { useTicketImageSave } from '../hooks/useTicketImageSave';

const paris = getDestination('fr');

function InteractivePreview(props: BoardingPassProps) {
  const { captureRef: ticketRef, status: saveStatus, save } = useTicketImageSave('storybook-gdgoc-dju');
  const [enlarged, setEnlarged] = useState(false);

  return (
    <>
      <div ref={ticketRef} data-ticket-save-region>
        <BoardingPass {...props} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={save}
          disabled={saveStatus === 'saving'}
          aria-busy={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? '이미지 준비 중…' : '탑승권 이미지 저장'}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => setEnlarged(true)}>
          크게 보기
        </button>
      </div>
      <p role={saveStatus === 'error' ? 'alert' : 'status'} className="mt-3 text-caption text-muted">
        {saveStatus === 'error'
          ? '이미지를 준비하지 못했어요. 다시 시도해주세요.'
          : saveStatus === 'success'
            ? '이미지 다운로드를 요청했어요. 브라우저의 다운로드를 확인해주세요.'
            : '예시 탑승권으로 이미지 저장과 확대를 확인할 수 있어요.'}
      </p>
      <EnlargedTicketModal open={enlarged} result={props.result} onClose={() => setEnlarged(false)} />
    </>
  );
}

const meta = {
  id: 'boarding-pass',
  title: '컴포넌트/탑승권',
  component: BoardingPass,
  args: { result: departurePreview },
  parameters: {
    canvasMaxWidth: 1080,
    viewport: {
      options: {
        ticketDesktop: {
          name: '탑승권 데스크톱 1080',
          styles: { width: '1080px', height: '760px' },
        },
      },
    },
  },
  globals: { viewport: { value: 'ticketDesktop', isRotated: false } },
} satisfies Meta<typeof BoardingPass>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const LowercaseName: Story = {
  args: { result: { ...departurePreview, passengerName: 'jason Jeong 정준혁' } },
  render: (args) => <InteractivePreview {...args} />,
};

export const CompactPhone: Story = {
  parameters: { canvasMaxWidth: 500 },
  globals: { viewport: { value: 'mobile390', isRotated: false } },
};

export const LongNameAndCity: Story = {
  args: {
    result: {
      ...departurePreview,
      passengerName: 'JASON ALEXANDER JEONG 함께 여행하는 우리',
      country: paris.wheelLabel,
      countryLabel: paris.name,
      city: paris.city,
      airportCode: paris.airportCode,
    },
  },
  parameters: { canvasMaxWidth: 500 },
  globals: { viewport: { value: 'mobile320', isRotated: false } },
};

export const Expanded: Story = {
  args: { exportMode: true, displayMode: 'expanded' },
  render: (args) => (
    <div className="ticket-enlarged">
      <BoardingPass {...args} />
    </div>
  ),
};

export const SaveAndEnlarge: Story = {
  parameters: { canvasMaxWidth: 500 },
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  render: (args) => <InteractivePreview {...args} />,
};
