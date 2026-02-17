/**
 * Generates a stable color from a given ID string.
 */
export const getColorFromId = (id: string) => {
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

    if (!id) return colors[0];

    // Simple hash function to get a stable index
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export const getRandomColor = () => {
    const colors = [
        '#f87171',
        '#fb923c',
        '#facc15',
        '#a3e635',
        '#4ade80',
        '#34d399',
        '#22d3ee',
        '#60a5fa',
        '#818cf8',
        '#a78bfa',
        '#e879f9',
        '#fb7185',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};
