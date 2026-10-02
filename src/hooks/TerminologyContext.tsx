import { createContext, useContext } from 'react';
import { defaultTerminology, type Terminology, type TermCategory } from '../utils/terminology';

export interface TerminologyAccess {
    terminology: Terminology;
    update: (value: Terminology) => void;
    collect: (category: TermCategory, text: string, explicit?: boolean) => void;
}
export const TerminologyContext = createContext<TerminologyAccess>({ terminology: defaultTerminology(), update: () => {}, collect: () => {} });
export const useTerminology = () => useContext(TerminologyContext);
