import { InputScreen, type InputScreenProps } from './InputScreen';
export type NicknameScreenProps = InputScreenProps;
export function NicknameScreen(props: NicknameScreenProps) {
  return <InputScreen {...props} kind="nickname" />;
}
