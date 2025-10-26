export default function SmokeHome() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      color: '#000000',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '48px', margin: '20px 0', color: '#10b981' }}>✅ SmokeHome OK</h1>
      <p style={{ fontSize: '18px', marginBottom: '10px' }}>
        Route is rendering. No React suspense, no auth, no layout.
      </p>
      <p style={{ fontSize: '14px', opacity: 0.6 }}>
        Time: {new Date().toLocaleTimeString()}
      </p>
      <div style={{ marginTop: '40px' }}>
        <a href="/__debug" style={{ 
          color: '#3b82f6', 
          textDecoration: 'underline', 
          margin: '0 10px',
          fontSize: '16px'
        }}>→ Debug Page</a>
        <a href="/__smoke" style={{ 
          color: '#3b82f6', 
          textDecoration: 'underline', 
          margin: '0 10px',
          fontSize: '16px'
        }}>→ Smoke Route</a>
      </div>
    </div>
  );
}
