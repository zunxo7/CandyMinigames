/**
 * Full-screen overlay when the game server is unreachable (e.g. Render cold start).
 * Shows "Loading server..." and blocks interaction until the server responds.
 */
const ServerLoadingOverlay = () => {
  return (
    <div className="server-loading-overlay" role="status" aria-live="polite">
      <div className="server-loading-content">
        <div className="server-loading-spinner" aria-hidden />
        <h1 className="server-loading-title">Loading server</h1>
        <p className="server-loading-sub">Connecting to game server…</p>
      </div>
    </div>
  );
};

export default ServerLoadingOverlay;
