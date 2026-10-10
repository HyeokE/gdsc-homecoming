import type { Preview } from '@storybook/react-vite';
import { MotionConfig } from 'motion/react';
import '../src/styles/globals.css';

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    reducedMotion: {
      description: '제품의 명시적인 동작 줄이기 상태',
      toolbar: {
        title: '동작',
        items: [
          { value: false, title: '기본' },
          { value: true, title: '동작 줄이기' },
        ],
      },
    },
  },
  initialGlobals: {
    reducedMotion: false,
    viewport: { value: 'mobile390', isRotated: false },
  },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    a11y: { test: 'error' },
    viewport: {
      options: {
        mobile320: {
          name: '모바일 320',
          styles: { width: '320px', height: '667px' },
        },
        mobile390: {
          name: '모바일 390',
          styles: { width: '390px', height: '844px' },
        },
        landscape667: {
          name: '가로 667',
          styles: { width: '667px', height: '375px' },
        },
        mobile375: {
          name: '모바일 375',
          styles: { width: '375px', height: '812px' },
        },
        mobile500: {
          name: '상한 500',
          styles: { width: '500px', height: '900px' },
        },
        landscape844: {
          name: '가로 844',
          styles: { width: '844px', height: '390px' },
        },
      },
    },
    docs: {
      description: {
        component:
          '실제 제품 표현 컴포넌트와 동일한 토큰을 사용합니다. 예시 데이터는 행사 명단이나 실제 국가 배정이 아닙니다.',
      },
    },
  },
  decorators: [
    (Story, context) => (
      <MotionConfig reducedMotion={context.globals.reducedMotion ? 'always' : 'user'}>
        <main
          className="mx-auto flex min-h-dvh w-full flex-col justify-center px-5 py-8"
          style={{ maxWidth: context.parameters.canvasMaxWidth ?? 500 }}
        >
          <Story
            args={{
              ...context.args,
              reducedMotion: Boolean(context.globals.reducedMotion) || context.args.reducedMotion,
            }}
          />
        </main>
      </MotionConfig>
    ),
  ],
};
export default preview;
