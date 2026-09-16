import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LINK_PROPS } from './Markdown.constants';
import { Prose, Table, TableScroll } from './Markdown.styles';
import type { MarkdownProps } from './Markdown.types';

const components: Components = {
  table: ({ children }) => (
    <TableScroll>
      <Table>{children}</Table>
    </TableScroll>
  ),
  a: ({ children, href }) => (
    <a href={href} {...LINK_PROPS}>
      {children}
    </a>
  ),
};

/**
 * Renders markdown from the model. Raw HTML is not enabled, so anything the
 * model emits is shown as text rather than injected into the page.
 */
export const Markdown = ({ children }: MarkdownProps) => (
  <Prose>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  </Prose>
);
