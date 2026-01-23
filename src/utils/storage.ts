
export function getStorage(key: string) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
}

export function setStorage(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
}
