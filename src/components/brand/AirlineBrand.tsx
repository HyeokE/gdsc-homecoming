export function AirlineBrand({ className = '' }: { className?: string }) {
  return (
    <strong className={className}>
      <svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">
        <path d="M19 7 6 16" stroke="#EA4335" />
        <path d="m6 16 13 9" stroke="#4285F4" />
        <path d="m29 7 13 9" stroke="#34A853" />
        <path d="m42 16-13 9" stroke="#FBBC05" />
      </svg>
      GDGoC DJU
    </strong>
  );
}
