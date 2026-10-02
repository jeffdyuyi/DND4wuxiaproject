import { Marked } from 'marked';

const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
// Author text can contain Markdown, but HTML and external images are inert.
const markdown = new Marked({ breaks: true, renderer: {
    html: token => escape(token.text),
    image: token => escape(token.text),
    link(token) {
        const label = this.parser.parseInline(token.tokens);
        if (!/^(https?:\/\/|mailto:|#)/i.test(token.href)) return label;
        return `<a href="${escape(token.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
} });
export function RichText({ text }: { text?: string }) {
    if (!text) return null;
    return <span className="rich-text" dangerouslySetInnerHTML={{ __html: markdown.parseInline(text, { async: false }) }} />;
}
