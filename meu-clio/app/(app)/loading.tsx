// Aparece na hora em que você toca numa aba, enquanto os dados chegam.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Carregando">
      <div className="sk sk-title" />
      <div className="sk sk-hero" />
      <div className="sk-row"><div className="sk sk-tile" /><div className="sk sk-tile" /><div className="sk sk-tile" /></div>
      <div className="sk sk-card" />
      <div className="sk sk-card short" />
    </div>
  );
}
