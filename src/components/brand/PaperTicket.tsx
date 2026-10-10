import type { ReactNode } from 'react';
import { AirlineBrand } from './AirlineBrand';
import './styles/paper-ticket.css';

export const contactUrl = 'https://open.kakao.com/o/gvuQCBRi';

export function PaperTicket({
  children,
  titleId,
  className = '',
}: {
  children: ReactNode;
  titleId: string;
  className?: string;
}) {
  return (
    <section className={`paper-ticket ${className}`} aria-labelledby={titleId}>
      <header className="paper-ticket__masthead">
        <AirlineBrand className="paper-ticket__brand" />
        <span className="paper-ticket__edition">HOMECOMING 2026</span>
      </header>
      {children}
      <footer className="paper-ticket__footer">
        <a href={contactUrl} className="paper-ticket__link">
          문의하기
        </a>
      </footer>
    </section>
  );
}

export function TicketPerforation() {
  return (
    <div className="paper-ticket__perforation" aria-hidden="true">
      <span />
    </div>
  );
}
