import { Marked } from 'marked';
import { useTerminology } from '../hooks/TerminologyContext';
import { createTermTranslator } from '../utils/term-display';

const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export function RichText({ text }: { text?: string }) {
    const { terminology } = useTerminology();
    if (!text) return null;
    const translate = createTermTranslator(terminology);
    const renderer = new Marked({ breaks: true, extensions: [{
        name: 'underline', level: 'inline',
        start: source => source.indexOf('++'),
        tokenizer(source) {
            const match = source.match(/^\+\+([^\n]+?)\+\+/);
            if (match) return { type: 'underline', raw: match[0], text: match[1], tokens: this.lexer.inlineTokens(match[1]) };
        },
        renderer(token) { return `<u>${this.parser.parseInline(token.tokens ?? [])}</u>`; },
    }], renderer: {
        text: token => escape(translate(token.text)),
        codespan: token => `<code>${escape(token.text)}</code>`,
        html: token => escape(token.text), image: token => escape(token.text),
        link(token) {
            const label = this.parser.parseInline(token.tokens);
            if (!/^(https?:\/\/|mailto:|#)/i.test(token.href)) return label;
            return `<a href="${escape(token.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        },
    } });
    const blocks = renderer.lexer(text).filter(token => token.type !== 'space');
    const block = blocks.length > 1 || blocks.some(token => !['paragraph', 'text'].includes(token.type));
    const html = block ? renderer.parse(text, { async: false }) : renderer.parseInline(text, { async: false });
    return block ? <div className="rich-text rich-text-block" dangerouslySetInnerHTML={{ __html: html }} />
        : <span className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
