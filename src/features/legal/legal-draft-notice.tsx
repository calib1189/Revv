export function LegalDraftNotice() {
  return (
    <div className="glass mb-8 rounded-2xl border-l-4 border-l-danger p-4 text-sm">
      <p className="font-semibold text-danger">Draft — not attorney-reviewed</p>
      <p className="mt-1 text-muted">
        This is a reasonable starting template, not legal advice. It has not been reviewed by a
        lawyer and should not be published or relied on as-is. Have counsel review and adapt it
        (jurisdiction, arbitration/venue clauses, age limits, data-protection regime) before this
        page is treated as your real terms.
      </p>
    </div>
  );
}
