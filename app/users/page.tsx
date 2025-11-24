export default function UsersPage() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-4 text-balance">
          Users
        </h1>
        <p className="text-lg font-mono text-muted-foreground leading-relaxed mb-8">
          User management and access control.
        </p>

        <div className="bg-card border-2 border-border">
          <div className="grid grid-cols-4 gap-4 p-4 border-b-2 border-border font-mono text-sm font-bold text-foreground">
            <div>Username</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-border font-mono text-sm text-muted-foreground hover:bg-accent/5 transition-colors">
              <div>user_{i + 1}</div>
              <div>user{i + 1}@example.com</div>
              <div>
                <span className="px-2 py-1 border border-border text-xs">
                  {i % 3 === 0 ? 'ADMIN' : i % 3 === 1 ? 'USER' : 'GUEST'}
                </span>
              </div>
              <div>
                <span className={`px-2 py-1 border text-xs ${
                  i % 2 === 0 
                    ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' 
                    : 'border-border text-muted-foreground'
                }`}>
                  {i % 2 === 0 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
