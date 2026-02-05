export const getRandomColor = () => {
    const colors = [
        '#f87171', // red-400
        '#fb923c', // orange-400
        '#facc15', // yellow-400
        '#a3e635', // lime-400
        '#4ade80', // green-400
        '#34d399', // emerald-400
        '#22d3ee', // cyan-400
        '#60a5fa', // blue-400
        '#818cf8', // indigo-400
        '#a78bfa', // violet-400
        '#e879f9', // fuchsia-400
        '#fb7185', // rose-400
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};
