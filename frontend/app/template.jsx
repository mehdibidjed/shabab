// Re-mounted on every navigation (unlike layout), so each page fades in.
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
