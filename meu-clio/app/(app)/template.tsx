// Remonta a cada navegação: transição curta (opacidade + leve subida), sem blur para não pesar no iPhone.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="view">{children}</div>;
}
