import { TermDisplay } from './TermDisplay';
import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ title, children, onCancel, className = '' }: { title: string; children: ReactNode; onCancel: () => void; className?: string }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);
    return <dialog ref={ref} className={`dialog ${className}`} aria-label={title} onCancel={event => { event.preventDefault(); onCancel(); }}>
        <h2>{<TermDisplay>{title}</TermDisplay>}</h2>{<TermDisplay>{children}</TermDisplay>}
    </dialog>;
}
