import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Lesson content. react-markdown never emits raw HTML from the source (no rehype-raw), so
 * instructors can't inject scripts; links open in a new tab with noopener.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-lesson text-ink max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {children}
            </a>
          ),
          // Images stay but never run anything; they are styled like the rest.
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === 'string' ? src : undefined}
              alt={alt ?? ''}
              loading="lazy"
              className="rounded-card"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
