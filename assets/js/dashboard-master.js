document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('dashboard-master');
    if (!container) return;

    const month = container.dataset.month;

    // Helper: Converts a date string to total minutes from midnight.
    const getMinutes = (dateStr) => {
        const d = new Date(dateStr);
        return d.getHours() * 60 + d.getMinutes();
    };

    //  Helper: Formats minutes to HH:mm.
    const formatHM = (mins) => {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    try {
        const response = await fetch(`assets/data/global-dashboard-${month}.json`);
        if (!response.ok) throw new Error("JSON Global não encontrado.");
        const data = await response.json();

        // Dark Mode Configuration (Gruvbox Material)
        Chart.defaults.color = '#a89984';
        Chart.defaults.borderColor = '#3c3836';

        // 1. Context Mapping (Colors and Totals)

        const contextMap = {};
        data.summaries.forEach(s => {
            contextMap[s.context] = { 
                color: s.color || '#888', 
                label: s.context, 
                total: s.total_minutes 
            };
        });

        // 2. "Timeline Processing (Chart B)"
        const timelineDatasets = {}; // { context: [ {x, y: [start, end]} ] }
        let globalMinStart = 1440;
        let globalMaxEnd = 0;
        const presentDates = new Set();

        data.all_entries.forEach(entry => {
            if (!entry.start || !entry.end) return;

            const ctx = entry.context || "outros";
            // Ensures the context exists in the map (fallback for robustness)
            if (!contextMap[ctx]) contextMap[ctx] = { color: '#504945', label: ctx, total: 0 };

            const dateStr = entry.start.split('T')[0];
            const startMin = getMinutes(entry.start);
            const endMin = getMinutes(entry.end);

            presentDates.add(dateStr);

            // Global limits for Y axis
            if (startMin < globalMinStart) globalMinStart = startMin;
            if (endMin > globalMaxEnd) globalMaxEnd = endMin;

            if (!timelineDatasets[ctx]) timelineDatasets[ctx] = [];
            
            // Floating Bar: x/y object independ
            timelineDatasets[ctx].push({
                x: dateStr,
                y: [startMin, endMin]
            });
        });

        // Rounds limits to whole hours (for visual display)
        globalMinStart = Math.floor(globalMinStart / 60) * 60;
        globalMaxEnd = Math.ceil(globalMaxEnd / 60) * 60;
        
        const sortedDates = Array.from(presentDates).sort();

        // Datasets mounts for B chart
        const datasetsB = Object.keys(timelineDatasets).map(ctx => ({
            label: contextMap[ctx].label,
            data: timelineDatasets[ctx],
            backgroundColor: contextMap[ctx].color,
            borderWidth: 0,
            barPercentage: 0.8,
            categoryPercentage: 0.9
        }));

        // ==========================================
        // Chart B: Timeline Global (Floating Bars)
        // ==========================================
        new Chart(document.getElementById('chart-master-chronological'), {
            type: 'bar',
            data: { 
                labels: sortedDates, 
                datasets: datasetsB 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        stacked: true, 
                        title: { display: true, text: 'Dia do Mês' },
                        grid: { color: '#32302f' }
                    },
                    y: { 
                        min: globalMinStart,
                        max: globalMaxEnd,
                        stacked: false, // Important: Values are absolute [start, end], not cumulative
                        ticks: {
                            stepSize: 120, // 2 hours
                            callback: v => formatHM(v)
                        },
                        title: { display: true, text: 'Horário' },
                        grid: { color: '#32302f' }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
                                const [s, e] = c.raw.y;
                                return `${c.dataset.label}: ${formatHM(s)} - ${formatHM(e)}`;
                            }
                        }
                    }
                }
            }
        });

        // ==========================================
        // VOLUME CHARTS (Reused/Adjusted)
        // ==========================================
	// CREATION OF A NEW FILTERED ARRAY - THIS IS THE ONLY TRULY NEW LINE
        const filteredContexts = Object.values(contextMap).filter(c => c.total > 0); 
        const labelsVol = filteredContexts.map(c => c.label);
        // Convert to hour
        const dataVol = filteredContexts.map(c => (c.total / 60).toFixed(1));
        const colorsVol = filteredContexts.map(c => c.color);

        // Chart C: Donut (Client volum)
        new Chart(document.getElementById('chart-master-donut'), {
            type: 'doughnut',
            data: {
                labels: labelsVol,
                datasets: [{ 
                    data: dataVol, 
                    backgroundColor: colorsVol, 
                    borderWidth: 1, 
                    borderColor: '#282828' 
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } } 
            }
        });

        // Chart A: Horizontal Bars (Ranking)
        new Chart(document.getElementById('chart-master-horizontal'), {
            type: 'bar',
            data: {
                labels: labelsVol,
                datasets: [{
                    data: dataVol,
                    backgroundColor: colorsVol,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: true, title: { display: true, text: 'Horas Totais' } },
                    y: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

    } catch (error) {
        console.error("Erro no Dashboard Master:", error);
    }
});
