import { InputScreen, type InputScreenProps } from './InputScreen';
export interface EmailScreenProps extends InputScreenProps {
  demoEmail?: string;
}
export function EmailScreen({ demoEmail, ...props }: EmailScreenProps) {
  return <InputScreen {...props} kind="email" demoEmail={demoEmail} />;
}
