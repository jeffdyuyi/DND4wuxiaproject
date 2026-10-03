import { Marked } from 'marked';
import { useTerminology } from '../hooks/TerminologyContext';
import { createTermTranslator } from '../utils/term-display';

const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export function RichText({ text }: { text?: string }) {
    const { terminology } = useTerminology();
    if (!text) return null;
    const translate = createTermTranslator(terminology);
    const renderer = new Marked({ breaks: true, renderer: {
        text: token => escape(translate(token.text)),
        codespan: token => `<code>${escape(token.text)}</code>`,
        html: token => escape(token.text), image: token => escape(token.text),
        link(token) {
            const label = this.parser.parseInline(token.tokens);
            if (!/^(https?:\/\/|mailto:|#)/i.test(token.href)) return label;
            return `<a href="${escape(token.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        },
    } });
    return <span className="rich-text" dangerouslySetInnerHTML={{ __html: renderer.parseInline(text, { async: false }) }} />;
}
