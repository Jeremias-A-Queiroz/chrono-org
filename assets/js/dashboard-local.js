document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('dashboard-local');
    if (!container) return;

    const context = container.dataset.context;
    const month = container.dataset.month;

// Consistent Color Generator via Bitwise (Suckless Hash)
    const stringToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };

    // Helper: Converts Date or ISO string to total minutes since midnight
    const getMinutesFromMidnight = (dateInput) => {
        const d = new Date(dateInput);
        return d.getHours() * 60 + d.getMinutes();
    };

    // Helper: Converts total minutes to HH:mm format
    const formatMinutesToHM = (totalMinutes) => {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    try {
        const response = await fetch(`assets/data/${context}-${month}.json`);
        if (!response.ok) throw new Error("JSON not found.");
        const entries = await response.json();

        const taskTotals = {};
        const timelineData = {}; // { taskId: [ {x, y: [start, end]}, ... ] }
        const daysPresent = new Set();
        
        let globalMinStart = 1440;
        let globalMaxEnd = 0;

        // Data process 
        entries.forEach(entry => {
            const taskId = entry.id || entry.task;
            const color = stringToColor(taskId);
            const dateStr = entry.start.split('T')[0];
            const dayLabel = dateStr.split('-')[2]; // Print day month
            daysPresent.add(dayLabel);
            
            const startMin = getMinutesFromMidnight(entry.start);
            const endMin = getMinutesFromMidnight(entry.end);
            const duration = entry.duration_minutes;

            // Updates global limits for the Dynamic Y-Axis
            if (startMin < globalMinStart) globalMinStart = startMin;
            if (endMin > globalMaxEnd) globalMaxEnd = endMin;

            // Donut group and Top5
            if (!taskTotals[taskId]) {
                taskTotals[taskId] = { label: entry.task, duration: 0, color: color };
            }
            taskTotals[taskId].duration += duration;

            // Timeline organization (Floating Bars by Objetos)
            if (!timelineData[taskId]) timelineData[taskId] = [];
            timelineData[taskId].push({
                x: dayLabel,
                y: [startMin, endMin]
            });
        });

        // Security margin on limites (full hour)
        globalMinStart = Math.floor(globalMinStart / 60) * 60;
        globalMaxEnd = Math.ceil(globalMaxEnd / 60) * 60;

        // Chart.js dark mode configuration for Dark Mode
        Chart.defaults.color = '#a89984';
        Chart.defaults.borderColor = '#3c3836';

        // ==========================================
        // CHART A: Monthly Timeline (Floating Bars)
        // ==========================================
        const sortedDayLabels = Array.from(daysPresent).sort((a, b) => parseInt(a) - parseInt(b));
        
        const datasetsA = Object.keys(timelineData).map(taskId => {
            return {
                label: taskTotals[taskId].label,
                data: timelineData[taskId],
                backgroundColor: taskTotals[taskId].color,
                borderWidth: 1,
                borderColor: '#1d2021',
                skipNull: true
            };
        });

        new Chart(document.getElementById('chart-local-hourly'), {
            type: 'bar',
            data: { 
                labels: sortedDayLabels, 
                datasets: datasetsA 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        title: { display: true, text: 'Dia do Mês' },
                        stacked: true // Ensures that multiple tasks scheduled for the same day occupy the same column.
                    },
                    y: { 
                        min: globalMinStart,
                        max: globalMaxEnd,
                        ticks: {
                            stepSize: 120, // 2 hours segments
                            callback: (value) => formatMinutesToHM(value)
                        },
                        title: { display: true, text: 'Timeline (Horas)' },
                        stacked: false // // Note: Bars represent absolute values and are not cumulative.
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const range = context.raw.y;
                                const s = formatMinutesToHM(range[0]);
                                const e = formatMinutesToHM(range[1]);
                                return `${context.dataset.label}: ${s} - ${e}`;
                            }
                        }
                    }
                }
            }
        });

        // ==========================================
        // // CHART B: Donut (Total per Task)
        // ==========================================
        const sortedTasks = Object.values(taskTotals).sort((a, b) => b.duration - a.duration);

        new Chart(document.getElementById('chart-local-donut'), {
            type: 'doughnut',
            data: {
                labels: sortedTasks.map(t => t.label),
                datasets: [{ 
                    data: sortedTasks.map(t => t.duration), 
                    backgroundColor: sortedTasks.map(t => t.color), 
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

        // ==========================================
        // CHART C: Top 5 Tasks (Horizontal Bar)
        // ==========================================
        const topTasks = sortedTasks.slice(0, 5);

        new Chart(document.getElementById('chart-local-toptasks'), {
            type: 'bar',
            data: {
                labels: topTasks.map(t => t.label.length > 25 ? t.label.substring(0,25)+'...' : t.label),
                datasets: [{
                    data: topTasks.map(t => t.duration),
                    backgroundColor: topTasks.map(t => t.color),
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: true, title: { display: true, text: 'Minutos Totais' } },
                    y: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

    } catch (error) {
        console.error("Error rendering Local Dashboard:", error);
    }
});
