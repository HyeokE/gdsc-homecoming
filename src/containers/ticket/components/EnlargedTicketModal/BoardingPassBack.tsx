import { AirlineBrand } from '@/components/brand';
import type { DepartureResult } from '../../types/departure';

/** Reverse-side print. The left stub aligns with the front's right-hand perforation. */
export function BoardingPassBack({ result }: { result: DepartureResult }) {
  return (
    <div className="pass-reverse">
      <aside className="pass-reverse__stub">
        <span className="pass-reverse__micro">KEEP THIS MEMORY</span>
        <div className="pass-reverse__stamp">
          <span>GDGoC DJU</span>
          <strong>
            WELCOME
            <br />
            HOME
          </strong>
          <span>21 NOV · 2026</span>
        </div>
        <p className="pass-reverse__stub-note">
          다시 만나는 우리,
          <br />
          여기서 이어지는 이야기.
        </p>
        <span className="pass-reverse__micro">HOMECOMING / 2026</span>
      </aside>
      <section className="pass-reverse__main">
        <header className="pass-reverse__header">
          <AirlineBrand className="pass-reverse__brand" />
          <span className="pass-reverse__micro">A JOURNEY BACK TO US</span>
        </header>
        <div className="pass-reverse__title">
          HOMECOMING<span>2026</span>
        </div>
        <div className="pass-reverse__route">
          <div>
            <strong>{result.airportCode}</strong>
            <span>{result.city}</span>
          </div>
          <svg viewBox="0 0 330 70" fill="none" aria-hidden="true">
            <path d="M9 56C90 -7 229 -7 321 56" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 5" />
            <circle cx="9" cy="56" r="4" fill="currentColor" />
            <circle cx="321" cy="56" r="4" fill="currentColor" />
            <path
              d="m166 5 2 12 18 8v3l-18-4-1 10 5 4v2l-8-2-8 2v-2l5-4-1-10-18 4v-3l18-8 2-12z"
              fill="currentColor"
              transform="rotate(18 164 22)"
            />
            <text x="165" y="61" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9" letterSpacing="2">
              ALL ROUTES LEAD HOME
            </text>
          </svg>
          <div>
            <strong>ICN</strong>
            <span>SEOUL / INCHEON</span>
          </div>
        </div>
        <footer className="pass-reverse__footer">
          <p>
            각자의 여행 끝에서, 다시 하나의 커뮤니티로.
            <br />
            <span>Keep the ticket. Take the memories.</span>
          </p>
          <div>
            <strong>21 NOV 2026</strong>
            <span>EVENT SOUVENIR · NOT VALID FOR AIR TRAVEL</span>
          </div>
        </footer>
        <div className="pass-reverse__registration" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>
    </div>
  );
}
