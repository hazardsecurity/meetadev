// Shown the moment a tab is tapped, while the server prepares the page.
// It also lets Next prefetch each tab ahead of the tap.
export default function Loading() {
  return (
    <div className="stack skeleton" aria-busy="true" aria-label="Loading">
      <span className="skeleton__line skeleton__line--title" />
      <span className="skeleton__line skeleton__line--short" />
      <div className="grid-people">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="card skeleton__card">
            <span className="skeleton__dot" />
            <span className="stack" style={{ "--gap": "8px", flex: 1 } as React.CSSProperties}>
              <span className="skeleton__line" />
              <span className="skeleton__line skeleton__line--short" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
