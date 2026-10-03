import { TermDisplay } from './TermDisplay';
import { Children, isValidElement, useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ title, children, onCancel, className = '' }: { title: string; children: ReactNode; onCancel: () => void; className?: string }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);
    const content = Children.toArray(children);
    const isFooter = (child: ReactNode) => isValidElement<{ className?: string }>(child) && child.props.className?.split(' ').includes('dialog-actions');
    return <dialog ref={ref} className={`dialog ${className}`} aria-label={title} onCancel={event => { event.preventDefault(); onCancel(); }}>
        <h2 className="dialog-heading">{<TermDisplay>{title}</TermDisplay>}</h2><div className="dialog-body"><TermDisplay>{content.filter(child => !isFooter(child))}</TermDisplay></div><TermDisplay>{content.filter(isFooter)}</TermDisplay>
    </dialog>;
}
