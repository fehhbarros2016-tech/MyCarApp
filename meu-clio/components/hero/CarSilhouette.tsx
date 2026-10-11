// Carro genérico em traço (para veículos sem foto). Usa a cor de destaque.
export function CarSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg className={`car car-svg ${className}`} viewBox="0 0 880 400" role="img" aria-label="Carro">
      <defs>
        <linearGradient id="cs-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".34" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity=".06" />
        </linearGradient>
        <linearGradient id="cs-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--fg)" stopOpacity=".22" />
          <stop offset="1" stopColor="var(--fg)" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <ellipse cx="440" cy="352" rx="360" ry="16" fill="#000" opacity=".25" />
      <path d="M88 292c-8-34 4-62 40-74l112-34c40-44 92-82 168-90 86-9 166 6 230 52l70 46c52 6 86 22 96 52l6 30c2 16-8 26-22 26H120c-18 0-28-2-32-8z"
        fill="url(#cs-body)" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M268 182c34-38 82-66 142-70 66-4 126 10 176 44l14 26H262z" fill="url(#cs-glass)" stroke="var(--accent)" strokeOpacity=".55" strokeWidth="3" />
      <path d="M440 112v70" stroke="var(--accent)" strokeOpacity=".5" strokeWidth="3" />
      <path d="M100 256h44M742 250h52" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" opacity=".8" />
      <g fill="var(--bg)" stroke="var(--accent)" strokeWidth="5">
        <circle cx="236" cy="300" r="52" /><circle cx="656" cy="300" r="52" />
      </g>
      <g fill="none" stroke="var(--fg)" strokeOpacity=".35" strokeWidth="3">
        <circle cx="236" cy="300" r="24" /><circle cx="656" cy="300" r="24" />
      </g>
    </svg>
  );
}
