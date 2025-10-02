export interface RenderKeyTarget {
  id?: string | number;
}

export function createRenderKeyGenerator<T extends RenderKeyTarget>() {
  const renderKeyMap = new WeakMap<T, string>();
  let renderKeyCounter = 0;

  return (entity: T, fallbackIndex = 0) => {
    const existing = renderKeyMap.get(entity);
    if (existing) return existing;

    const idPart =
      typeof entity.id === "number" || typeof entity.id === "string"
        ? String(entity.id)
        : "anon";

    const key = `${idPart}_${++renderKeyCounter}_${fallbackIndex}`;
    renderKeyMap.set(entity, key);
    return key;
  };
}
