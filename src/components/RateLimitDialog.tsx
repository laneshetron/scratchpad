interface RateLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RateLimitDialog({ open, onOpenChange }: RateLimitDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Rate Limit Reached</h3>
        <button onClick={() => onOpenChange(false)} style={{ color: '#9CA3AF', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
      <p style={{ marginTop: '8px', fontSize: '0.875rem', color: '#6B7280' }}>
        You've reached the rate limit for AI requests. Please wait 1 minute before trying again.
      </p>
    </div>
  );
}
