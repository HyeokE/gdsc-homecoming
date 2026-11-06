import cindyImage from './assets/speakers/cindy.jpeg';
import harryImage from './assets/speakers/harry.jpeg';
import jasonImage from './assets/speakers/jason.jpeg';
import pascalImage from './assets/speakers/pascal.jpeg';
import wantImage from './assets/speakers/want.jpeg';
import './styles/program.css';

interface Session {
  speaker: string;
  title: string;
  subtitle?: string;
  imageSrc?: string;
}

const SESSIONS: Session[] = [
  {
    speaker: 'Cindy',
    title: '안녕~ 𝐽𝑢𝑛𝑖𝑜𝑟 입니다! 이거 제 커리어양,',
    subtitle: 'GDSC에서 주니어 프디가 되기까지',
    imageSrc: cindyImage,
  },
  { speaker: 'Harry', title: '대체되기 전까지 꾸준히 성장하는 법', imageSrc: harryImage },
  {
    speaker: 'Jason',
    title: '지금의 내가, 그때의 나에게',
    subtitle: '비전공 취준생에서 4년 차 개발자까지.',
    imageSrc: jasonImage,
  },
  {
    speaker: 'Pascal',
    title: '제목 추후 공개',
    imageSrc: pascalImage,
  },
  {
    speaker: 'Want',
    imageSrc: wantImage,
    title: '왔다네 정말로, 아무도 안 믿었던 멸종위기개발',
    subtitle: '취업부터 그 너머까지 개발자로 살아간다는 것',
  },
];
export function HomeProgram() {
  return (
    <>
      <section className="home-program" aria-labelledby="home-speakers-title">
        <h2 id="home-speakers-title" className="home-program__speakers-title">
          SPEAKERS
        </h2>
        <ul className="home-program__speakers">
          {SESSIONS.map(({ speaker, title, subtitle, imageSrc }) => (
            <li key={speaker} className="home-program__speaker-card">
              <div className="home-program__speaker-photo">
                {imageSrc ? (
                  <img src={imageSrc} alt={`${speaker} 프로필`} loading="lazy" width={600} height={450} />
                ) : (
                  <span aria-hidden="true">{speaker.charAt(0)}</span>
                )}
              </div>
              <div className="home-program__speaker-info">
                <h3>{speaker}</h3>
                <p>{title}</p>
                {subtitle && <p className="home-program__speaker-subtitle">{subtitle}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section id="timetable" className="home-program" aria-labelledby="timetable-title">
        <h2 id="timetable-title" className="home-program__title">
          SCHEDULE
        </h2>
        <div className="schedule-layout">
          <div className="schedule-sessions">
            {SESSIONS.map(({ speaker, title, subtitle }, index) => (
              <div key={speaker}>
                <article className="schedule-entry">
                  <div className="schedule-entry__meta">
                    <span>SESSION {String(index + 1).padStart(2, '0')}</span>
                    <span>20분</span>
                  </div>
                  <h3>{title}</h3>
                  <p className="schedule-entry__speaker">{speaker}</p>
                  {subtitle && <p className="schedule-entry__description">{subtitle}</p>}
                </article>
                {speaker === 'Harry' && (
                  <p className="schedule-break">
                    <span>휴식</span>
                    <span>5분</span>
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
