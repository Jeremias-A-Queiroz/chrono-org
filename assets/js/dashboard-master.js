document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('dashboard-master');
    if (!container) return;

    const month = container.dataset.month;

    // Helper: Converte Date string para minutos totais desde a meia-noite
    const getMinutes = (dateStr) => {
        const d = new Date(dateStr);
        return d.getHours() * 60 + d.getMinutes();
    };

    // Helper: Formata minutos para HH:mm
    const formatHM = (mins) => {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    try {
        const response = await fetch(`assets/data/global-dashboard-${month}.json`);
        if (!response.ok) throw new Error("JSON Global não encontrado.");
        const data = await response.json();

        // Configuração Dark Mode (Gruvbox Material)
        Chart.defaults.color = '#a89984';
        Chart.defaults.borderColor = '#3c3836';

        // 1. Mapeamento de Contextos (Cores e Totais)
        const contextMap = {};
        data.summaries.forEach(s => {
            contextMap[s.context] = { 
                color: s.color || '#888', 
                label: s.context, 
                total: s.total_minutes 
            };
        });

        // 2. Processamento para Timeline (Gráfico B)
        const timelineDatasets = {}; // { context: [ {x, y: [start, end]} ] }
        let globalMinStart = 1440;
        let globalMaxEnd = 0;
        const presentDates = new Set();

        data.all_entries.forEach(entry => {
            if (!entry.start || !entry.end) return;

            const ctx = entry.context || "outros";
            // Garante que o contexto exista no mapa (fallback para robustez)
            if (!contextMap[ctx]) contextMap[ctx] = { color: '#504945', label: ctx, total: 0 };

            const dateStr = entry.start.split('T')[0];
            const startMin = getMinutes(entry.start);
            const endMin = getMinutes(entry.end);

            presentDates.add(dateStr);

            // Atualiza limites globais do eixo Y
            if (startMin < globalMinStart) globalMinStart = startMin;
            if (endMin > globalMaxEnd) globalMaxEnd = endMin;

            if (!timelineDatasets[ctx]) timelineDatasets[ctx] = [];
            
            // Floating Bar: Objeto x/y independente
            timelineDatasets[ctx].push({
                x: dateStr,
                y: [startMin, endMin]
            });
        });

        // Arredonda limites para horas cheias (margem visual)
        globalMinStart = Math.floor(globalMinStart / 60) * 60;
        globalMaxEnd = Math.ceil(globalMaxEnd / 60) * 60;
        
        const sortedDates = Array.from(presentDates).sort();

        // Montagem dos Datasets para o Gráfico B
        const datasetsB = Object.keys(timelineDatasets).map(ctx => ({
            label: contextMap[ctx].label,
            data: timelineDatasets[ctx],
            backgroundColor: contextMap[ctx].color,
            borderWidth: 0,
            barPercentage: 0.8,
            categoryPercentage: 0.9
        }));

        // ==========================================
        // GRÁFICO B: Timeline Global (Floating Bars)
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
                        stacked: true, // Contextos se empilham na mesma coluna do dia
                        title: { display: true, text: 'Dia do Mês' },
                        grid: { color: '#32302f' }
                    },
                    y: { 
                        min: globalMinStart,
                        max: globalMaxEnd,
                        stacked: false, // Importante: Valores são absolutos [start, end], não somam
                        ticks: {
                            stepSize: 120, // 2 horas
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
        // GRÁFICOS DE VOLUME (Reaproveitados/Ajustados)
        // ==========================================
	// CRIAÇÃO DE UM NOVO ARRAY FILTRADO - ESTA É A ÚNICA LINHA REALMENTE NOVA
        const filteredContexts = Object.values(contextMap).filter(c => c.total > 0); 
        const labelsVol = filteredContexts.map(c => c.label);
        // Converter para horas para facilitar leitura
        const dataVol = filteredContexts.map(c => (c.total / 60).toFixed(1));
        const colorsVol = filteredContexts.map(c => c.color);

        // Gráfico C: Donut (Volume por Cliente)
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

        // Gráfico A: Barras Horizontais (Ranking)
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
