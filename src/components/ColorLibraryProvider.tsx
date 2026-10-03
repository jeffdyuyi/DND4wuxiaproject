import { useState } from 'react';
import type { ReactNode } from 'react';
import { ColorLibraryContext } from '../hooks/ColorLibraryContext';
import { loadColorLibrary, saveColorLibrary, upsertColor } from '../utils/color-library';
import { browserStorage } from '../utils/storage';

export function ColorLibraryProvider({ children }: { children: ReactNode }) {
    const [loaded] = useState(() => loadColorLibrary(browserStorage));
    const [colors, setColors] = useState(loaded.colors);
    const [error, setError] = useState(loaded.error);
    const commit = (next: typeof colors) => {
        if (loaded.error) return { ok: false, error: loaded.error };
        const result = saveColorLibrary(browserStorage, next);
        setError(result.error);
        if (result.ok) setColors(next);
        return result;
    };
    const save = (name: string, color: string) => {
        try { return commit(upsertColor(colors, name, color)); }
        catch (cause) { return { ok: false, error: cause instanceof Error ? cause.message : '配色无法保存' }; }
    };
    return <ColorLibraryContext.Provider value={{ colors, error, blocked: !!loaded.error, recovery: loaded.raw, save, remove: id => { commit(colors.filter(entry => entry.id !== id)); } }}>{children}</ColorLibraryContext.Provider>;
}
