import { TermDisplay } from './TermDisplay';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';

const LAYOUT_KEY = 'wuxia.editor-share.v1';
function initialShare() {
    try { const value = Number(localStorage.getItem(LAYOUT_KEY)); return value >= 40 && value <= 70 ? value : 60; }
    catch { return 60; }
}

export function EditorWorkbench({ editor, preview, resourceId }: { editor: ReactNode; preview: ReactNode; resourceId: string }) {
    const [share, setShare] = useState(initialShare);
    const [pane, setPane] = useState('edit');
    const [anchors, setAnchors] = useState<string[]>([]);
    const anchorElements = useRef<HTMLElement[]>([]);
    const [active, setActive] = useState('');
    const areaRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        try { localStorage.setItem(LAYOUT_KEY, String(share)); } catch { /* Layout remains usable without storage. */ }
    }, [share]);
    useEffect(() => {
        const host = editorRef.current;
        if (!host) return;
        const collect = () => {
            const elements = [...host.querySelectorAll<HTMLElement>('.form-group > label, .editor-panel > h3, .editor-group > summary')];
            anchorElements.current = elements;
            setAnchors(elements.map(element => element.textContent?.trim() || '编辑区块'));
        };
        collect();
        const observer = new MutationObserver(collect);
        observer.observe(host, { childList: true, subtree: true, characterData: true });
        const track = () => {
            const panel = host.querySelector('.editor-panel');
            if (!panel) return;
            const top = panel.getBoundingClientRect().top + 28;
            const allLabels = [...host.querySelectorAll<HTMLElement>('.form-group > label, .editor-panel > h3, .editor-group > summary')];
            const labels = allLabels.filter(el => el.getClientRects().length);
            const current = labels.filter(el => el.getBoundingClientRect().top <= top).at(-1) ?? labels[0];
            if (current) setActive(String(allLabels.indexOf(current)));
        };
        host.addEventListener('scroll', track, true);
        return () => { observer.disconnect(); host.removeEventListener('scroll', track, true); };
    }, [resourceId]);
    const jump = (index: string) => {
        if (index === '') return;
        const anchor = anchorElements.current[Number(index)];
        if (!anchor) return;
        let parent = anchor.parentElement;
        while (parent && parent !== editorRef.current) { if (parent instanceof HTMLDetailsElement) parent.setAttribute('open', ''); parent = parent.parentElement; }
        anchor.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        setActive(index);
    };
    return <div className="editor-workbench" data-pane={pane} ref={areaRef} style={{ '--editor-share': `${share}fr`, '--preview-share': `${100 - share}fr` } as CSSProperties}>
        <div className="workbench-tabs" role="tablist" aria-label="编辑与预览" onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 'edit' : event.key === 'End' ? 'preview' : pane === 'edit' ? 'preview' : 'edit';
                setPane(next);
                event.currentTarget.querySelector<HTMLButtonElement>(`#${next}-tab`)?.focus();
            }
        }}>
            <button id="edit-tab" role="tab" tabIndex={pane === 'edit' ? 0 : -1} aria-controls="edit-pane" aria-selected={pane === 'edit'} onClick={() => setPane('edit')}><TermDisplay>{"编辑内容"}</TermDisplay></button>
            <button id="preview-tab" role="tab" tabIndex={pane === 'preview' ? 0 : -1} aria-controls="preview-pane" aria-selected={pane === 'preview'} onClick={() => setPane('preview')}><TermDisplay>{"卡片预览"}</TermDisplay></button>
        </div>
        <section id="edit-pane" className="editor-column" aria-label="编辑内容">
            <div className="editor-navigation"><strong><TermDisplay>{"内容编辑"}</TermDisplay></strong><label><TermDisplay>{"跳转到 "}</TermDisplay><select aria-label="定位编辑字段或章节" value={active} onChange={event => jump(event.target.value)}><option value=""><TermDisplay>{"选择字段或章节"}</TermDisplay></option>{anchors.map((anchor, index) => <option key={index} value={index}>{<TermDisplay>{anchor}</TermDisplay>}</option>)}</select></label></div>
            <div className="editor-content" ref={editorRef}>{<TermDisplay>{editor}</TermDisplay>}</div>
        </section>
        <div className="editor-divider" role="separator" aria-label="调整编辑区宽度" aria-orientation="vertical" aria-valuemin={40} aria-valuemax={70} aria-valuenow={share} tabIndex={0}
            onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home') { event.preventDefault(); setShare(value => event.key === 'Home' ? 60 : Math.max(40, Math.min(70, value + (event.key === 'ArrowRight' ? 2 : -2)))); } }}
            onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const bounds = areaRef.current?.getBoundingClientRect(); if (bounds) setShare(Math.max(40, Math.min(70, Math.round((event.clientX - bounds.left) / bounds.width * 100)))); }}
            onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} />
        <section id="preview-pane" className="preview-column" aria-label="卡片预览">{<TermDisplay>{preview}</TermDisplay>}</section>
    </div>;
}
