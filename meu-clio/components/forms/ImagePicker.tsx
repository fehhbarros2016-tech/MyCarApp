"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Foto pela câmera ou galeria. Antes de enviar, reduz no próprio celular (lado maior ~1200 px):
 * JPEG para fotos comuns e PNG quando a imagem tem fundo transparente (carro recortado).
 * O arquivo reduzido substitui o original no campo, então o formulário envia algo leve.
 */
export function ImagePicker({ name = "photo", current, label = "Foto", keepAlpha = false, onPicked }: {
  name?: string; current?: string | null; label?: string; keepAlpha?: boolean; onPicked?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const onFile = async (file: File | undefined) => {
    if (!file || !input.current) return;
    setBusy(true);
    try {
      const small = await shrink(file, keepAlpha);
      const dt = new DataTransfer();
      dt.items.add(small);
      input.current.files = dt.files;
      setPreview(URL.createObjectURL(small));
      setRemoved(false);
      onPicked?.();
    } catch {
      setPreview(URL.createObjectURL(file)); // sem redução: envia o original
    } finally { setBusy(false); }
  };

  return (
    <div className="field">
      <span className="lbl">{label}</span>
      <div className="img-pick" data-has={Boolean(preview && !removed)}>
        {preview && !removed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : <span className="img-empty"><Icon name="camera" size={22} /><span>Tirar ou escolher foto</span></span>}
        {busy && <span className="img-busy"><span className="spin" /></span>}
        <input ref={input} type="file" name={name} accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} aria-label={label} />
      </div>
      {preview && !removed && (
        <button type="button" className="link-btn" onClick={() => { setRemoved(true); if (input.current) input.current.value = ""; }}>
          <Icon name="trash" size={14} /> Remover foto
        </button>
      )}
      {removed && current && <input type="hidden" name="removePhoto" value="1" />}
    </div>
  );
}

async function shrink(file: File, keepAlpha: boolean): Promise<File> {
  const bmp = await loadImage(file);
  const max = 1200;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const alpha = keepAlpha && hasAlpha(ctx, w, h);
  const type = alpha ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), type, 0.82));
  return new File([blob], alpha ? "foto.png" : "foto.jpg", { type });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < d.length; i += 4 * 16) if (d[i] < 250) return true;
  return false;
}
