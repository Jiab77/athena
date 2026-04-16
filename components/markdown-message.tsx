import ReactMarkdown from 'react-markdown'
import remarkEmoji from 'remark-emoji'
import remarkGfm from 'remark-gfm'

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkEmoji]}
      components={{
        code({ inline, className, children }: any) {
          return inline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
              {children}
            </code>
          ) : (
            <pre className="bg-muted/50 border border-muted-foreground/20 rounded-md p-3 overflow-x-auto mb-2">
              <code className="text-xs font-mono text-foreground">
                {String(children).replace(/\n$/, '')}
              </code>
            </pre>
          )
        },
        p: ({ children }) => (
          <div className="mb-2 text-foreground">{children}</div>
        ),
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-foreground">{children}</ol>,
        li: ({ children }) => <li className="ml-2">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground mb-2">
            {children}
          </blockquote>
        ),
        h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold text-foreground mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold text-foreground mb-2">{children}</h3>,
        a: ({ href, children }) => (
          <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-border text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted text-muted-foreground">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-border even:bg-muted/30">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-semibold border-r border-border last:border-r-0">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 border-r border-border last:border-r-0">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
