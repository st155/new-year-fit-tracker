export default function DebugPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#00ffff',
      fontFamily: 'monospace',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '48px', margin: '20px 0' }}>✅ App Router OK</h1>
      <p style={{ fontSize: '18px', opacity: 0.8 }}>
        React is rendering. BrowserRouter is working.
      </p>
      <p style={{ fontSize: '14px', opacity: 0.6, marginTop: '20px' }}>
        This route bypasses ProtectedRoute and lazy loading.
      </p>
      <div style={{ marginTop: '40px' }}>
        <a href="/" style={{ color: '#00ffff', textDecoration: 'underline', margin: '0 10px' }}>← Home</a>
        <a href="/health" style={{ color: '#00ffff', textDecoration: 'underline', margin: '0 10px' }}>Health Check</a>
        <a href="/health-check.html" style={{ color: '#00ffff', textDecoration: 'underline', margin: '0 10px' }}>Static Health</a>
      </div>
    </div>
  );
}
