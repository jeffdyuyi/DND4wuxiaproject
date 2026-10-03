import { createContext, useContext } from 'react';
import type { SavedColor } from '../utils/color-library';

export interface ColorLibraryAccess {
    colors: SavedColor[];
    error: string;
    blocked: boolean;
    recovery: string | null;
    save: (name: string, color: string) => { ok: boolean; error: string };
    remove: (id: string) => void;
}
export const ColorLibraryContext = createContext<ColorLibraryAccess>({ colors: [], error: '', blocked: false, recovery: null, save: () => ({ ok: false, error: '配色库尚未就绪' }), remove: () => {} });
export const useColorLibrary = () => useContext(ColorLibraryContext);
