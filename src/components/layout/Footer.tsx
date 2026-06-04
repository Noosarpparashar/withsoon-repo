export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto py-6 text-center text-sm text-gray-500">
      <p>
        © {new Date().getFullYear()}{" "}
        <span className="text-[var(--accent-light)]">withsoon.com</span> — AI guides, tools & experiments
      </p>
    </footer>
  );
}
