import type { Item } from '../types';
import { originalBody, type OriginalEntry } from '../utils/templates';

export function TemplateReference({ item }: { item: Item | null }) {
    if (!item?.templateReference) return null;
    const reference = item.templateReference as { entryId?: string; sourceVersion?: string; originalJSON?: string };
    let body = item.sourceText;
    try { if (reference.originalJSON) body = originalBody(JSON.parse(reference.originalJSON) as OriginalEntry); } catch { /* Keep saved text if an older extension has no parseable original. */ }
    const warnings = Array.isArray(item.templateWarnings) ? item.templateWarnings.filter((warning): warning is string => typeof warning === 'string') : [];
    return <>
        {warnings.length > 0 && <div className="template-check-notice" role="note"><strong>转换待核对 · {warnings.length} 项</strong><ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        <details className="editor-group">
        <summary>4E 原版对照{warnings.length ? ` · ${warnings.length} 项待核对` : ''}</summary>
        <p className="progression-hint">{reference.entryId} · {reference.sourceVersion}</p>
        <pre className="template-body">{body}</pre>
        <details><summary>保留的原始字段</summary><pre className="template-body">{reference.originalJSON}</pre></details>
    </details></>;
}
