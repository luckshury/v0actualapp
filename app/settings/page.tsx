export default function SettingsPage() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-4 text-balance">
          Settings
        </h1>
        <p className="text-lg font-mono text-muted-foreground leading-relaxed mb-8">
          Configure your application preferences and system settings.
        </p>

        <div className="space-y-6">
          <section className="bg-card border-2 border-border p-6">
            <h2 className="text-2xl font-mono font-semibold text-foreground mb-4">
              General Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border">
                <div>
                  <p className="font-mono font-semibold text-foreground">Notifications</p>
                  <p className="font-mono text-xs text-muted-foreground">$ enable_notifications</p>
                </div>
                <div className="px-3 py-1 border border-accent text-accent font-mono text-sm">
                  ENABLED
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-border">
                <div>
                  <p className="font-mono font-semibold text-foreground">Auto-save</p>
                  <p className="font-mono text-xs text-muted-foreground">$ auto_save</p>
                </div>
                <div className="px-3 py-1 border border-accent text-accent font-mono text-sm">
                  ENABLED
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-border">
                <div>
                  <p className="font-mono font-semibold text-foreground">Debug Mode</p>
                  <p className="font-mono text-xs text-muted-foreground">$ debug_mode</p>
                </div>
                <div className="px-3 py-1 border border-border text-muted-foreground font-mono text-sm">
                  DISABLED
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card border-2 border-border p-6">
            <h2 className="text-2xl font-mono font-semibold text-foreground mb-4">
              API Configuration
            </h2>
            <div className="space-y-3">
              <div className="p-4 border border-border">
                <p className="font-mono text-sm text-muted-foreground mb-2">API Key</p>
                <p className="font-mono text-xs text-foreground bg-muted p-3 border border-border">
                  [Your API Key Here]
                </p>
              </div>
              <div className="p-4 border border-border">
                <p className="font-mono text-sm text-muted-foreground mb-2">Webhook URL</p>
                <p className="font-mono text-xs text-foreground bg-muted p-3 border border-border">
                  https://api.example.com/webhooks/v1
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
