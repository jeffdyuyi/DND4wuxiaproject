import { useRef, type RefObject } from 'react';
import { continueMarkdownList, formatMarkdown, markdownShortcut, type MarkdownFormat, type TextEdit } from '../utils/markdown-edit';

const formats: { format: MarkdownFormat; label: string; shortcut: string }[] = [
    { format: 'bold', label: '加粗', shortcut: 'Ctrl / ⌘ + B' },
    { format: 'italic', label: '斜体', shortcut: 'Ctrl / ⌘ + I' },
    { format: 'underline', label: '下划线', shortcut: 'Ctrl / ⌘ + U' },
    { format: 'unordered', label: '无序列表', shortcut: 'Ctrl / ⌘ + Shift + 8' },
    { format: 'ordered', label: '有序列表', shortcut: 'Ctrl / ⌘ + Shift + 7' },
];

export function MarkdownTextarea({ id, label, value, onChange, textareaRef }: {
    id: string; label: string; value: string; onChange: (value: string) => void;
    textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
    const localRef = useRef<HTMLTextAreaElement>(null);
    const ref = textareaRef ?? localRef;
    const apply = (edit: TextEdit) => {
        onChange(edit.value);
        requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(edit.start, edit.end); });
    };
    const format = (kind: MarkdownFormat) => {
        const input = ref.current;
        if (input) apply(formatMarkdown(value, input.selectionStart, input.selectionEnd, kind));
    };
    return <div className="markdown-editor">
        <div className="markdown-toolbar" role="group" aria-label={`${label}的文本格式`}>
            {formats.map(button => <button key={button.format} type="button" className="btn" title={`${button.label}（${button.shortcut}）`}
                aria-label={`${label}：${button.label}`} onMouseDown={event => event.preventDefault()} onClick={() => format(button.format)}>{button.label}</button>)}
        </div>
        <textarea ref={ref} id={id} className="form-control" wrap="soft" value={value} aria-describedby={`${id}-markdown-help`}
            onChange={event => onChange(event.target.value)} onKeyDown={event => {
                if (event.nativeEvent.isComposing || event.altKey) return;
                const key = event.key.toLowerCase();
                if (event.ctrlKey || event.metaKey) {
                    const kind = markdownShortcut(event.key, event.code, event.shiftKey);
                    if (kind) { event.preventDefault(); event.stopPropagation(); format(kind); }
                } else if (key === 'enter' && !event.shiftKey) {
                    const edit = continueMarkdownList(value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd);
                    if (edit) { event.preventDefault(); apply(edit); }
                }
            }} />
        <small id={`${id}-markdown-help`} className="markdown-help">支持 Markdown；下划线用 ++文字++。列表内回车续项，空项回车结束；Shift + Enter 换行。</small>
    </div>;
}
