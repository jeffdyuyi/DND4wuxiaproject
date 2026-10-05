import { RichText } from './RichText';

/** Read-only typography; preserves text and never executes source HTML. */
export function TemplateText({ text, original = false }: { text: string; original?: boolean }) {
    const blocks: { heading?: number; text: string }[] = [];
    let paragraph: string[] = [];
    const flush = () => { if (paragraph.length) { blocks.push({ text: paragraph.join('\n') }); paragraph = []; } };
    for (const line of text.split(/\r?\n/)) {
        const heading = line.match(/^(!{1,6}|#{1,6})\s+(.+)$/);
        if (heading) { flush(); blocks.push({ heading: heading[1].length, text: heading[2] }); }
        else if (!line.trim()) flush();
        else paragraph.push(line);
    }
    flush();
    return <div className="template-prose">{blocks.map((block, index) => {
        const content = original ? block.text : <RichText text={block.text} />;
        if (block.heading) return block.heading <= 2 ? <h4 key={index}>{content}</h4> : <h5 key={index}>{content}</h5>;
        return original ? <p key={index}>{content}</p> : <div className="template-paragraph" key={index}>{content}</div>;
    })}</div>;
}
