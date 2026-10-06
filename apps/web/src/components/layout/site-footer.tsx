import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="text-muted-foreground mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>AI Academy. Live courses on AI and digital marketing.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/courses" className="hover:text-slate-900">
            Courses
          </Link>
          <Link href="/register" className="hover:text-slate-900">
            Create account
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
