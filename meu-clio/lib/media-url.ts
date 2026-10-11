/** URL interna (protegida pelo cookie de acesso) para mostrar uma imagem do bucket privado. */
export const mediaUrl = (path: string | null | undefined) => (path ? `/api/media?p=${encodeURIComponent(path)}` : null);
