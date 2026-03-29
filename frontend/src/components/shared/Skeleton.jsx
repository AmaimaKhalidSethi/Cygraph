export default function Skeleton({ width = '100%', height = 16, style = {} }) {
  return (
    <div style={{
      width, height,
      background: 'linear-gradient(90deg, #0d2444 25%, #1a3a5c 50%, #0d2444 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 2,
      ...style,
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}