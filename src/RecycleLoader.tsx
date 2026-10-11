type RecycleLoaderProps = {
  size?: 'small' | 'medium' | 'large';
  label?: string;
};

export default function RecycleLoader({ size = 'medium', label }: RecycleLoaderProps) {
  return (
    <span className={`recycle-loader recycle-loader--${size}`} role="status" aria-label={label ?? 'Loading'}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g className="recycle-loader__arrows" fill="none" stroke="#A8C69F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M31 6a26 26 0 0 1 23 19" />
          <path d="m48 20 7 6 3-9" />
          <path d="M56 34a26 26 0 0 1-19 23" />
          <path d="m43 53-7 6-3-9" />
          <path d="M26 57A26 26 0 0 1 7 38" />
          <path d="m10 45-4-8 9-1" />
        </g>
      </svg>
      {label && <span className="recycle-loader__label">{label}</span>}
    </span>
  );
}
