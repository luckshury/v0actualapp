export default function DataPage() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-4 text-balance">
          Data
        </h1>
        <p className="text-lg font-mono text-muted-foreground leading-relaxed mb-8">
          Database connections and data management tools.
        </p>

        <div className="space-y-6">
          <section className="bg-card border-2 border-border p-6">
            <h2 className="text-2xl font-mono font-semibold text-foreground mb-4">
              Database Status
            </h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center p-3 border border-border">
                <span className="text-muted-foreground">$ postgres://main</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500">
                  CONNECTED
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border border-border">
                <span className="text-muted-foreground">$ redis://cache</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500">
                  CONNECTED
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border border-border">
                <span className="text-muted-foreground">$ mongodb://logs</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500">
                  CONNECTED
                </span>
              </div>
            </div>
          </section>

          <section className="bg-card border-2 border-border p-6">
            <h2 className="text-2xl font-mono font-semibold text-foreground mb-4">
              Recent Queries
            </h2>
            <div className="space-y-2 font-mono text-xs text-muted-foreground">
              <p className="p-3 bg-muted border border-border">
                SELECT * FROM users WHERE active = true LIMIT 100;
              </p>
              <p className="p-3 bg-muted border border-border">
                UPDATE sessions SET last_active = NOW() WHERE id = &apos;abc123&apos;;
              </p>
              <p className="p-3 bg-muted border border-border">
                INSERT INTO logs (event, timestamp) VALUES (&apos;user_login&apos;, NOW());
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
