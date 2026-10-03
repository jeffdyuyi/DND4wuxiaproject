import { useMemo, type ReactNode } from 'react';
import { useTerminology } from '../hooks/TerminologyContext';
import { createTermTranslator } from '../utils/term-display';

export function TermDisplay({ children }: { children: ReactNode }) {
    const { terminology } = useTerminology();
    const translate = useMemo(() => createTermTranslator(terminology), [terminology]);
    const display = (node: ReactNode): ReactNode => typeof node === 'string' ? translate(node) : Array.isArray(node) ? node.map(display) : node;
    return <>{display(children)}</>;
}
