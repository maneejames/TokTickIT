import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";

function MainContent() {
  const { currentRequester } = useRequester();

  return (
    <AppShell>
      {currentRequester && (
        <div className="container py-5 text-center">
          <div className="zen-card p-5 mx-auto" style={{ maxWidth: "680px" }}>
            <h2 className="h4" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
              Welcome, {currentRequester.name}!
            </h2>
            <p className="text-muted mt-2 mb-0">
              Department: <strong>{currentRequester.department}</strong> | Email: <strong>{currentRequester.email}</strong>
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}
