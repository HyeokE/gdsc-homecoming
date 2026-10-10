import { useRef, useState } from 'react';
import './test-account-chip.css';

interface TestAccountChipProps {
  disabled?: boolean;
  onReset: () => void;
}

export function TestAccountChip({ disabled = false, onReset }: TestAccountChipProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState(false);

  function handleReset() {
    try {
      onReset();
      dialogRef.current?.close();
    } catch {
      setError(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className="test-account-chip"
        aria-label="테스트 데이터 관리"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          setError(false);
          dialogRef.current?.showModal();
        }}
      >
        TEST
      </button>
      <dialog ref={dialogRef} className="test-account-chip__dialog" aria-label="테스트 데이터 초기화">
        <h2>테스트 데이터를 초기화할까요?</h2>
        <p>이 브라우저의 테스트 탑승권을 지우고 처음부터 시작해요. 실제 참가자 데이터는 유지돼요.</p>
        {error && <p role="alert">초기화하지 못했어요. 다시 시도해주세요.</p>}
        <div className="test-account-chip__actions">
          <button type="button" onClick={() => dialogRef.current?.close()}>
            취소
          </button>
          <button type="button" onClick={handleReset}>
            초기화
          </button>
        </div>
      </dialog>
    </>
  );
}
