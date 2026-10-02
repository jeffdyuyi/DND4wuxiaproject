import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ title, children, onCancel }: { title: string; children: ReactNode; onCancel: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);
    return <dialog ref={ref} className="dialog" aria-label={title} onCancel={event => { event.preventDefault(); onCancel(); }}>
        <h2>{title}</h2>{children}
    </dialog>;
}
