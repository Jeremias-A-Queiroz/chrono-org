document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('dashboard-local');
    if (!container) return;

    const context = container.dataset.context;
    const month = container.dataset.month;

    // Gerador de Cor Consistente via Bitwise (Suckless Hash)
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

    try {
        // Como o teste.html está em unimed/, o path relativo para os dados é assets/data/...
        const response = await fetch(`assets/data/${context}-${month}.json`);
        if (!response.ok) throw new Error("JSON não encontrado.");
        const entries = await response.json();

        const taskTotals = {};
        const hourlyData = {};

        // Processamento dos dados
        entries.forEach(entry => {
            const taskId = entry.id || entry.task;
            const color = stringToColor(taskId);
            
            // Agrupamento para Donut e Gantt
            if (!taskTotals[taskId]) {
                taskTotals[taskId] = { label: entry.task, duration: 0, color: color };
            }
            taskTotals[taskId].duration += entry.duration_minutes;

            // Fatiador de Tempo (Time Slicer) para Timeline 24h
            let current = new Date(entry.start);
            let end = new Date(entry.end);
            
            while (current < end) {
                let nextHour = new Date(current);
                nextHour.setHours(current.getHours() + 1, 0, 0, 0);
                
                let chunkEnd = nextHour < end ? nextHour : end;
                let mins = (chunkEnd - current) / 60000;
                let hourStr = current.getHours().toString().padStart(2, '0') + ':00';

                if (!hourlyData[hourStr]) hourlyData[hourStr] = {};
                if (!hourlyData[hourStr][taskId]) hourlyData[hourStr][taskId] = 0;
                
                hourlyData[hourStr][taskId] += mins;
                current = chunkEnd;
            }
        });

        // Configuração de cores globais do Chart.js para Dark Mode
        Chart.defaults.color = '#a89984';
        Chart.defaults.borderColor = '#3c3836';

        // ==========================================
        // GRÁFICO A: Timeline 24h (Stacked Bar)
        // ==========================================
        const hoursSorted = Object.keys(hourlyData).sort();
        const datasetsA = Object.keys(taskTotals).map(taskId => {
            return {
                label: taskTotals[taskId].label,
                data: hoursSorted.map(h => hourlyData[h][taskId] || 0),
                backgroundColor: taskTotals[taskId].color,
                borderWidth: 0
            };
        });

        new Chart(document.getElementById('chart-local-hourly'), {
            type: 'bar',
            data: { labels: hoursSorted, datasets: datasetsA },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true, 
                        max: 60, // Eixo Y fixo em 60 minutos
                        title: { display: true, text: 'Minutos' } 
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        // ==========================================
        // GRÁFICO B: Donut
        // ==========================================
        const labelsB = Object.values(taskTotals).map(t => t.label);
        const dataB = Object.values(taskTotals).map(t => t.duration);
        const bgColorsB = Object.values(taskTotals).map(t => t.color);

        new Chart(document.getElementById('chart-local-donut'), {
            type: 'doughnut',
            data: {
                labels: labelsB,
                datasets: [{ data: dataB, backgroundColor: bgColorsB, borderWidth: 1, borderColor: '#282828' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // ==========================================
        // GRÁFICO C: Top 5 Tasks (Horizontal Bar)
        // ==========================================
        const topTasks = Object.values(taskTotals)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5); // Pega apenas os 5 maiores

        new Chart(document.getElementById('chart-local-toptasks'), {
            type: 'bar',
            data: {
                labels: topTasks.map(t => t.label.length > 20 ? t.label.substring(0,20)+'...' : t.label),
                datasets: [{
                    data: topTasks.map(t => t.duration),
                    backgroundColor: topTasks.map(t => t.color),
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y', // Define como barra horizontal
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false }, // Oculta o eixo X visualmente para parecer um Gantt
                    y: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

    } catch (error) {
        console.error("Erro ao renderizar Dashboard Local:", error);
    }
});
