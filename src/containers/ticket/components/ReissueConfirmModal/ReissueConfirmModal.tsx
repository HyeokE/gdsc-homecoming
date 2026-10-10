import { Modal } from './Modal';
import { primaryButtonClass, secondaryButtonClass } from '@/components/common/buttonClasses';
export interface ReissueConfirmModalProps {
  open: boolean;
  currentCountry: string;
  isTestAccount?: boolean;
  status?: 'idle' | 'loading' | 'error' | 'unavailable' | 'checking-result';
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}
export function ReissueConfirmModal({
  open,
  currentCountry,
  isTestAccount = false,
  status = 'idle',
  error,
  onClose,
  onConfirm,
}: ReissueConfirmModalProps) {
  const busy = status === 'loading' || status === 'checking-result';
  return (
    <Modal open={open} title="출발 국가를 바꿔 재발급할까요?" onClose={onClose} busy={busy}>
      <p className="text-body">
        현재 출발 국가는 <strong>{currentCountry}</strong>입니다.
      </p>
      <p className="mt-3 text-body text-muted">
        {isTestAccount
          ? '테스트 계정은 횟수 제한 없이 재발급할 수 있어요. 실제 참가자의 배정에는 영향을 주지 않아요.'
          : '재발급하면 현재 출발 국가를 다시 선택할 수 없어요. 변경 기회는 한 번뿐이에요.'}
      </p>
      {status === 'unavailable' ? (
        <p role="status" className="mt-5 text-caption text-info">
          지금은 변경 가능한 출발 국가가 없어요. 현재 탑승권과 재발급 기회는 유지돼요.
        </p>
      ) : (
        error && (
          <p role="alert" className="mt-5 text-caption text-error">
            {error}
          </p>
        )
      )}
      {busy && (
        <p role="status" className="mt-5 text-caption text-muted">
          {status === 'checking-result' ? '재발급 결과를 확인하고 있어요.' : '새 탑승권을 준비하고 있어요.'}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          disabled={busy || status === 'unavailable'}
          onClick={onConfirm}
          className={primaryButtonClass}
        >
          {busy ? '처리 중…' : status === 'error' ? '다시 시도' : '출발 국가 바꿔 재발급'}
        </button>
        <button type="button" disabled={busy} onClick={onClose} className={secondaryButtonClass}>
          현재 탑승권 유지
        </button>
      </div>
    </Modal>
  );
}
