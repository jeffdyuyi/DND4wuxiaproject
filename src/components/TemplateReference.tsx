import { reviewTarget } from '../utils/template-review';
import type { Item } from '../types';
import { originalBody, type OriginalEntry } from '../utils/templates';

export function TemplateReference({ item }: { item: Item | null }) {
    if (!item?.templateReference) return null;
    const reference = item.templateReference as { entryId?: string; sourceVersion?: string; originalJSON?: string };
    let body = item.sourceText;
    try { if (reference.originalJSON) body = originalBody(JSON.parse(reference.originalJSON) as OriginalEntry); } catch { /* Keep saved text if an older extension has no parseable original. */ }
    const warnings = Array.isArray(item.templateWarnings) ? item.templateWarnings.filter((warning): warning is string => typeof warning === 'string') : [];
    const locate = (button: HTMLButtonElement, warning: string) => {
        const panel = button.closest('.editor-panel');
        const target = panel?.querySelector<HTMLElement>(`[data-review="${reviewTarget(warning)}"]`) ?? panel?.querySelector<HTMLElement>('[data-review="original"]');
        if (!target) return;
        let parent: HTMLElement | null = target;
        while (parent && parent !== panel) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
        target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        const input = target.querySelector<HTMLElement>('input, textarea, select, summary');
        input?.focus({ preventScroll: true });
    };
    return <>
        {warnings.length > 0 && <div className="template-check-notice" role="note"><strong>转换待核对 · {warnings.length} 项</strong><ul>{warnings.map((warning, index) => <li key={index}>{warning} <button type="button" className="btn review-link" onClick={event => locate(event.currentTarget, warning)}>{reviewTarget(warning) === 'original' ? '查看原版' : '定位内容'}</button></li>)}</ul></div>}
        <details className="editor-group" data-review="original">
        <summary>4E 原版对照{warnings.length ? ` · ${warnings.length} 项待核对` : ''}</summary>
        <p className="progression-hint">{reference.entryId} · {reference.sourceVersion}</p>
        <pre className="template-body">{body}</pre>
        <details><summary>保留的原始字段</summary><pre className="template-body">{reference.originalJSON}</pre></details>
    </details></>;
}
