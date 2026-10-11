// Páginas para imprimir ou salvar em PDF: fundo branco, sem barra de navegação.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-root">{children}</div>;
}
