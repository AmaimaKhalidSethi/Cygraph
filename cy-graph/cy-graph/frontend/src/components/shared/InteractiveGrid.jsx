import { useEffect, useState } from 'react';

export default function InteractiveGrid() {
  const [cells, setCells] = useState([]);
  const [currentColor, setCurrentColor] = useState('rgba(0, 212, 255, 0.4)'); // #00d4ff

  useEffect(() => {
    // Calculate number of cells needed to fill the screen
    const updateGridSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const cellSize = 40;
      const cols = Math.ceil(screenWidth / cellSize) + 2; // +2 for buffer
      const rows = Math.ceil(screenHeight / cellSize) + 2; // +2 for buffer
      const totalCells = cols * rows;

      setCells(Array.from({ length: totalCells }, (_, i) => ({
        id: i,
        row: Math.floor(i / cols),
        col: i % cols,
      })));
    };

    updateGridSize();
    window.addEventListener('resize', updateGridSize);

    // Color fluctuation animation
    const colorInterval = setInterval(() => {
      setCurrentColor(prevColor => {
        // Toggle between #00d4ff (lighter) and a darker shade #0088aa
        return prevColor === 'rgba(0, 212, 255, 0.4)' ? 'rgba(0, 136, 170, 0.4)' : 'rgba(0, 212, 255, 0.4)';
      });
    }, 2000); // Change color every 2 seconds

    return () => {
      window.removeEventListener('resize', updateGridSize);
      clearInterval(colorInterval);
    };
  }, []);

  const getGlowColor = (baseColor) => {
    return baseColor === 'rgba(0, 212, 255, 0.4)' ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 136, 170, 0.6)';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 40px)',
        gridTemplateRows: 'repeat(auto-fill, 40px)',
        zIndex: 0,
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="grid-cell"
          style={{
            width: '40px',
            height: '40px',
            border: '0.5px solid rgba(255, 255, 255, 0.05)',
            transition: 'background-color 0.5s ease, box-shadow 0.5s ease',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = currentColor;
            e.target.style.boxShadow = `0 0 15px ${getGlowColor(currentColor)}`;
            e.target.style.transition = 'background-color 0s, box-shadow 0s';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.boxShadow = 'none';
            e.target.style.transition = 'background-color 0.5s ease, box-shadow 0.5s ease';
          }}
        />
      ))}
    </div>
  );
}