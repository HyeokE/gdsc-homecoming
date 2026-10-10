import { HomeContainer } from '@/containers/home';
import { TicketContainer, type TicketRuntime } from '@/containers/ticket';

export default function App({ runtime }: { runtime?: TicketRuntime }) {
  return <TicketContainer runtime={runtime} landing={(onStart) => <HomeContainer onStart={onStart} />} />;
}
