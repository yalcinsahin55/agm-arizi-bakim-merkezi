import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { TechnicianType } from '@/types';

export type CategoryLike = {
  _id: ObjectId | string;
  nightRouteType?: TechnicianType;
  parentId?: string | null;
};

/**
 * Bir kategorinin gece nöbet penceresinde hangi teknisyen tipine
 * yönlendirileceğini bulur. Alt kategorinin kendi ayarı yoksa üst
 * kategorisine bakılır; hiçbiri ayarlanmamışsa güvenli varsayılan
 * olarak 'normal' döner.
 */
export async function resolveNightRouteType(
  d: Db,
  category: CategoryLike | null,
): Promise<TechnicianType> {
  if (!category) return 'normal';
  if (category.nightRouteType) return category.nightRouteType;
  if (!category.parentId) return 'normal';
  const parent = await d
    .collection<CategoryLike>('categories')
    .findOne({ _id: new ObjectId(String(category.parentId)) });
  return parent?.nightRouteType || 'normal';
}
