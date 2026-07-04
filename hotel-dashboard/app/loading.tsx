import MarkSvg from '@/components/MarkSvg';

export default function Loading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <span style={{ animation: 'crping 1.6s ease-in-out infinite' }}>
        <MarkSvg size={44} color="#262420" />
      </span>
      <span className="cr-eyebrow">Scanning the portfolio…</span>
      <style>{`
        @keyframes crping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.92); }
        }
      `}</style>
    </main>
  );
}
