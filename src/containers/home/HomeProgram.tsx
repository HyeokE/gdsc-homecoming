import { TicketPerforation } from '@/components/brand';
import './styles/program.css';

const SESSIONS = [
  { speaker: 'Jason', title: '커뮤니티에서 시작된 나의 개발 이야기' },
  { speaker: 'Harry', title: '사이드 프로젝트가 커리어가 되기까지' },
  { speaker: 'Cindy', title: '함께 일하고 싶은 개발자로 성장하기' },
  { speaker: 'Want', title: 'AI와 함께 바뀌는 개발자의 일상' },
] as const;
export function HomeProgram() {
  return (
    <>
      <TicketPerforation />
      <section id="timetable" className="home-program" aria-labelledby="timetable-title">
        <h2 id="timetable-title" className="home-program__title">
          SCHEDULE
        </h2>
        <div className="schedule-layout">
          <div className="schedule-sessions">
            {SESSIONS.map(({ speaker, title }, index) => (
              <div key={speaker}>
                <article className="schedule-entry">
                  <span className="schedule-entry__number">{String(index + 1).padStart(2, '0')}</span>
                  <div className="schedule-entry__main">
                    <h3>{title}</h3>
                    <span className="schedule-entry__subtitle">{speaker}</span>
                  </div>
                  <span className="schedule-entry__time">
                    20
                    <span>분</span>
                  </span>
                </article>
                {speaker === 'Harry' && (
                  <p className="schedule-entry schedule-break">
                    <span className="schedule-break__label">휴식</span>
                    <span className="schedule-entry__time">5분</span>
                  </p>
                )}
              </div>
            ))}
          </div>
          <article className="schedule-feature">
            <header>
              <h3>Q&A 인터뷰</h3>
              <span>30분–1시간</span>
            </header>
            <p>사전 질문 + 실시간 질문</p>
          </article>
          <article className="schedule-feature">
            <header>
              <h3>파티 + 네트워킹</h3>
            </header>
          </article>
        </div>
      </section>
    </>
  );
}
