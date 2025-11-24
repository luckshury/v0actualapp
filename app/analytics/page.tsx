export default function AnalyticsPage() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-4xl font-mono font-bold text-foreground text-balance">
            Analytics
          </h1>
          <span className="px-3 py-1 bg-accent/10 border-2 border-accent text-accent font-mono text-sm font-bold">
            NEW
          </span>
        </div>
        <p className="text-lg font-mono text-muted-foreground leading-relaxed mb-8">
          Real-time analytics and performance metrics for your applications.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border-2 border-border p-6">
            <p className="font-mono text-sm text-muted-foreground mb-2">$ total_users</p>
            <p className="text-4xl font-mono font-bold text-foreground">12,847</p>
            <p className="font-mono text-xs text-emerald-500 mt-2">+23.4% this month</p>
          </div>
          <div className="bg-card border-2 border-border p-6">
            <p className="font-mono text-sm text-muted-foreground mb-2">$ active_sessions</p>
            <p className="text-4xl font-mono font-bold text-foreground">1,293</p>
            <p className="font-mono text-xs text-emerald-500 mt-2">+12.1% vs yesterday</p>
          </div>
          <div className="bg-card border-2 border-border p-6">
            <p className="font-mono text-sm text-muted-foreground mb-2">$ avg_response_time</p>
            <p className="text-4xl font-mono font-bold text-foreground">142ms</p>
            <p className="font-mono text-xs text-emerald-500 mt-2">-8.3% improvement</p>
          </div>
        </div>

        <section className="bg-card border-2 border-border p-6">
          <h2 className="text-2xl font-mono font-semibold text-foreground mb-4">
            System Performance
          </h2>
          <div className="space-y-4 font-mono text-sm">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">CPU Usage</span>
                <span className="text-foreground">34%</span>
              </div>
              <div className="h-2 bg-muted border border-border">
                <div className="h-full bg-accent" style={{ width: '34%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Memory Usage</span>
                <span className="text-foreground">67%</span>
              </div>
              <div className="h-2 bg-muted border border-border">
                <div className="h-full bg-accent" style={{ width: '67%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Network I/O</span>
                <span className="text-foreground">45%</span>
              </div>
              <div className="h-2 bg-muted border border-border">
                <div className="h-full bg-accent" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
