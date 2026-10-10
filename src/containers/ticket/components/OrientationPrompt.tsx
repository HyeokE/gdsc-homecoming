import { useEffect, useRef } from 'react';
import '../styles/orientation-prompt.css';

export function OrientationPrompt() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="orientation-prompt" aria-labelledby="orientation-title">
      <div className="orientation-prompt__graphic" aria-hidden="true">
        <div className="orientation-prompt__phone" />
        <svg className="orientation-prompt__arrow" viewBox="0 0 112 112" fill="none">
          <path d="M79 12c14 6 23 20 23 36m-7-7 7 7 7-7" />
        </svg>
      </div>
      <h1 id="orientation-title" ref={heading} tabIndex={-1}>
        가로로 돌리면 이어서 진행해요.
      </h1>
    </section>
  );
}
