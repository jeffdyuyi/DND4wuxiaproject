
export function getStorage(key: string) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
}

export function setStorage(key: string, data: any) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            alert('⚠️ 本地存储空间已满！\n请先使用"导出"功能备份数据，再删除部分条目以释放空间。');
        }
    }
}
