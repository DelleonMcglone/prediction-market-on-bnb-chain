export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-6">
        <p className="text-sm uppercase tracking-widest text-muted">
          Igbo Labs · Case Study № 007
        </p>
        <h1 className="text-4xl font-semibold">
          Prediction Market Demo
        </h1>
        <p className="text-muted leading-relaxed">
          An LMSR-backed prediction market on BNB testnet.
          Scaffold is live &mdash; trading UI lands in Phase 05.
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-mono text-muted border border-muted/30 rounded px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Phase 01 · repo scaffold
        </div>
      </div>
    </main>
  );
}
