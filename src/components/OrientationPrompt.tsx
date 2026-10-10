import { useEffect, useRef } from 'react'
import '../styles/orientation-prompt.css'

export function OrientationPrompt() {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])
  return (
    <section className="orientation-prompt" aria-labelledby="orientation-title">
      <div className="orientation-prompt__phone" aria-hidden="true" />
      <h1 id="orientation-title" ref={heading} tabIndex={-1}>
        휴대폰을 가로로 돌려주세요
      </h1>
      <p>국가 공개와 출발 전광판을 가로 화면에서 보여드릴게요.</p>
      <p className="orientation-prompt__hint">
        가로로 돌리면 이어서 진행해요. 화면이 바뀌지 않으면 회전 잠금을
        확인해주세요.
      </p>
    </section>
  )
}
