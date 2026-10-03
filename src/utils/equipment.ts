import type { EquipmentItem, EquipmentVersion } from '../types';

export function applyEquipmentVersion(item: EquipmentItem, version: EquipmentVersion): EquipmentItem {
    return { ...item, level: version.level, price: version.price, enhance: version.enhance, crit: version.crit, selectedVersionId: version.id };
}
