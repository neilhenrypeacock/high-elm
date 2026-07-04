export default function TrendPanel({ snapshotWeeks }: { snapshotWeeks: number }) {
  const MIN_WEEKS = 3;

  if (snapshotWeeks < MIN_WEEKS) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-2xl mb-3">📈</div>
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
          Collecting data
        </div>
        <div className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          This view needs at least {MIN_WEEKS} weekly scrape runs to show a meaningful trend.
          Currently have {snapshotWeeks} week{snapshotWeeks === 1 ? '' : 's'} of data.
          Run the pipeline again next week and this will start filling in.
        </div>
      </div>
    );
  }

  // Once enough data exists, trend charts go here (V1.1)
  return null;
}
