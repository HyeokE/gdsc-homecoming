import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import App from '../App';
import { DEMO_STORAGE_KEY } from '@/containers/ticket';
import { createTicketRuntime } from '@/containers/ticket';

const demoRuntime = createTicketRuntime({ VITE_TICKET_SERVICE: 'demo' });

let restoreDemoStorage = () => {};

function RouteReadback({ onRemount }: { onRemount: (path: string) => void }) {
  const location = useLocation();
  return (
    <aside aria-label="회귀 검사 도구" className="bg-canvas p-2 text-foreground">
      <output aria-label="현재 경로">{location.pathname}</output>
      <button onClick={() => onRemount(location.pathname)}>앱 새로 마운트</button>
    </aside>
  );
}
function AppRegression() {
  const [mount, setMount] = useState({ key: 0, path: '/' });
  return (
    <MemoryRouter key={mount.key} initialEntries={[mount.path]}>
      <RouteReadback onRemount={(path) => setMount((value) => ({ key: value.key + 1, path }))} />
      <App runtime={demoRuntime} />
    </MemoryRouter>
  );
}
const meta = {
  title: '흐름/데모 발권 회귀',
  component: AppRegression,
  tags: ['!autodocs'],
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: {
    canvasIncludesMain: true,
    docs: {
      description: {
        component:
          '제품 App의 라우팅과 복원을 검사합니다. 이 Storybook origin의 두 데모 저장 키만 잠시 초기화하고 종료 즉시 복구합니다. 실제 행사 자료가 아닙니다.',
      },
    },
  },
  beforeEach: () => {
    const previousLocal = localStorage.getItem(DEMO_STORAGE_KEY);
    const previousSession = sessionStorage.getItem('gdg-demo-participant');
    localStorage.removeItem(DEMO_STORAGE_KEY);
    sessionStorage.removeItem('gdg-demo-participant');
    restoreDemoStorage = () => {
      if (previousLocal === null) {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      } else {
        localStorage.setItem(DEMO_STORAGE_KEY, previousLocal);
      }
      if (previousSession === null) {
        sessionStorage.removeItem('gdg-demo-participant');
      } else {
        sessionStorage.setItem('gdg-demo-participant', previousSession);
      }
    };
    return restoreDemoStorage;
  },
} satisfies Meta<typeof AppRegression>;
export default meta;
export const IssueThenRestore: StoryObj<typeof meta> = {
  globals: { viewport: { value: 'mobile390', isRotated: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    try {
      await userEvent.click(await canvas.findByRole('button', { name: '발권하기' }));
      const email = await canvas.findByRole('textbox', {
        name: '신청한 이메일',
      });
      fireEvent.change(email, { target: { value: 'demo@gdg.example' } });
      await expect(email).toHaveValue('demo@gdg.example');
      await userEvent.click(canvas.getByRole('button', { name: '확인하기' }));
      const nickname = await canvas.findByRole('textbox', {
        name: '닉네임 + 성',
      });
      fireEvent.change(nickname, { target: { value: 'JASON JEONG' } });
      await expect(nickname).toHaveValue('JASON JEONG');
      await userEvent.click(canvas.getByRole('button', { name: '발권하기' }));
      await waitFor(() => expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/departure'));
      await expect(canvas.queryByRole('region', { name: '탑승권 발권' })).not.toBeInTheDocument();
      const confirm = await canvas.findByRole('button', { name: /.+ 발권하기$/ }, { timeout: 12000 });
      await expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/departure');
      await waitFor(() => expect(confirm).toBeEnabled(), { timeout: 12000 });
      await expect(canvas.queryByRole('region', { name: '탑승권 발권' })).not.toBeInTheDocument();
      await userEvent.click(confirm);
      await waitFor(() => expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/issuer'));
      await expect(canvas.getByRole('region', { name: '탑승권 발권' })).toHaveAttribute('data-phase', 'preparing');
      const pickup = await canvas.findByRole('button', { name: '탑승권 받기' }, { timeout: 6000 });
      await userEvent.click(pickup);
      const notice = within(await canvas.findByRole('dialog', { name: '탑승권 받기' }));
      await expect(notice.getByText('절취선 위쪽을 잡고 오른쪽 아래로 당겨주세요.')).toBeVisible();
      await expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/issuer');
      const tearHandle = notice.getByRole('button', {
        name: '오른쪽 탑승권 뜯기',
      });
      tearHandle.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(
        () =>
          expect(canvas.getByLabelText('현재 경로')).toHaveTextContent(
            /^\/user\/result\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
        { timeout: 3000 },
      );
      const resultPath = canvas.getByLabelText('현재 경로').textContent;
      await expect(canvas.getByRole('heading', { name: '당신의 탑승권' })).toBeInTheDocument();
      const storedBeforeReplay = localStorage.getItem(DEMO_STORAGE_KEY);
      const ticketBeforeReplay = canvas.getByRole('article').textContent;
      await userEvent.click(canvas.getByRole('button', { name: '발권 애니메이션 다시보기' }));
      await waitFor(() => expect(canvas.getByLabelText('현재 경로')).toHaveTextContent('/departure'));
      await userEvent.click(canvas.getByRole('button', { name: '탑승권으로 돌아가기' }));
      await waitFor(() => expect(canvas.getByLabelText('현재 경로').textContent).toBe(resultPath));
      await expect(canvas.getByRole('article').textContent).toBe(ticketBeforeReplay);
      await expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe(storedBeforeReplay);
      await userEvent.click(canvas.getByRole('button', { name: '발권 애니메이션 다시보기' }));
      const replayConfirm = await canvas.findByRole('button', { name: /.+ 발권하기$/ }, { timeout: 12000 });
      await waitFor(() => expect(replayConfirm).toBeEnabled(), { timeout: 12000 });
      await userEvent.click(replayConfirm);
      await userEvent.click(await canvas.findByRole('button', { name: '탑승권 받기' }, { timeout: 6000 }));
      const replayDialog = within(await canvas.findByRole('dialog', { name: '탑승권 받기' }));
      replayDialog.getByRole('button', { name: '오른쪽 탑승권 뜯기' }).focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(canvas.getByLabelText('현재 경로').textContent).toBe(resultPath), { timeout: 3000 });
      await expect(canvas.getByRole('article').textContent).toBe(ticketBeforeReplay);
      await expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe(storedBeforeReplay);
      await userEvent.click(canvas.getByRole('button', { name: '앱 새로 마운트' }));
      await waitFor(() => expect(canvas.getByRole('heading', { name: '당신의 탑승권' })).toBeInTheDocument());
      await expect(canvas.getByLabelText('현재 경로').textContent).toBe(resultPath);
      await expect(canvas.getByRole('button', { name: '조각 티켓 저장' })).toBeVisible();
    } finally {
      restoreDemoStorage();
    }
  },
};

/** Manual Aside QA of live portrait confirmation/printing; teardown restores storage. */
export const ManualPortraitPrinting: StoryObj<typeof meta> = {};
