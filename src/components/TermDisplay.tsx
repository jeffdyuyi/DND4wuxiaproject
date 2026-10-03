import { useMemo, type ReactNode } from 'react';
import { useTerminology } from '../hooks/TerminologyContext';
import { createTermTranslator } from '../utils/term-display';
import type { TermCategory } from '../utils/terminology';

export function TermDisplay({ children, scope }: { children: ReactNode; scope?: TermCategory | 'keyword' }) {
    const { terminology } = useTerminology();
    const translate = useMemo(() => createTermTranslator(terminology, false, scope), [terminology, scope]);
    const display = (node: ReactNode): ReactNode => typeof node === 'string' ? translate(node) : Array.isArray(node) ? node.map(display) : node;
    return <>{display(children)}</>;
}
