document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('dashboard-master');
    if (!container) return;

    const month = container.dataset.month;

    try {
        const response = await fetch(`../assets/data/global-dashboard-${month}.json`);
        if (!response.ok) throw new Error("JSON Global não encontrado.");
        const globalData = await response.json();

        // Configurações do Tema Dark
        Chart.defaults.color = '#a89984';
        Chart.defaults.borderColor = '#3c3836';

        // ==========================================
        // PREPARAÇÃO DE DADOS MESTRES
        // ==========================================
        
        // 1. Coleta e Organiza os Contextos (Clientes)
        const contextTotals = {};
        globalData.summaries.forEach(sum => {
            if(sum.context !== 'index') {
                contextTotals[sum.context] = {
                    total: sum.total_minutes / 60, // Trabalhamos em horas no Master
                    color: sum.color || '#888'
                };
            }
        });

        // 2. Organiza Entradas Diárias para Gráfico Cronológico
        const dailyData = {};
        const datesSet = new Set();

        globalData.all_entries.forEach(entry => {
            if(!entry.start) return;
            const dateStr = entry.start.split('T')[0];
            datesSet.add(dateStr);
            
            // Fallback de contexto/cor via tags caso o LISP não mande a chave context na entry
            let ctx = "outro";
            let color = "#504945";
            if (entry.tags && entry.tags.length > 0) {
                // Tenta achar cor correspondente nos summaries (simplificado)
                ctx = entry.tags[0]; 
            }

            if(!dailyData[dateStr]) dailyData[dateStr] = {};
            if(!dailyData[dateStr][ctx]) dailyData[dateStr][ctx] = { dur: 0, color: color };
            
            dailyData[dateStr][ctx].dur += (entry.duration_minutes / 60);
        });

        const sortedDates = Array.from(datesSet).sort();

        // ==========================================
        // GRÁFICO B: Barras Cronológicas (Stack diário)
        // ==========================================
        // Extrai todos os "sub-contextos" únicos encontrados nos dias
        const allKeys = new Set();
        Object.values(dailyData).forEach(dayObj => Object.keys(dayObj).forEach(k => allKeys.add(k)));
        
        const datasetsB = Array.from(allKeys).map(key => {
            return {
                label: key,
                data: sortedDates.map(date => dailyData[date][key] ? dailyData[date][key].dur : 0),
                backgroundColor: sortedDates.map(date => dailyData[date][key] ? dailyData[date][key].color : '#000'),
                borderWidth: 0
            };
        });

        new Chart(document.getElementById('chart-master-chronological'), {
            type: 'bar',
            data: { labels: sortedDates, datasets: datasetsB },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true,
                        title: { display: true, text: 'Horas' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        // ==========================================
        // GRÁFICO C: Donut (Total por Cliente)
        // ==========================================
        const labelsC = Object.keys(contextTotals);
        const dataC = Object.values(contextTotals).map(c => c.total);
        const bgColorsC = Object.values(contextTotals).map(c => c.color);

        new Chart(document.getElementById('chart-master-donut'), {
            type: 'doughnut',
            data: {
                labels: labelsC,
                datasets: [{ data: dataC, backgroundColor: bgColorsC, borderWidth: 1, borderColor: '#282828' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // ==========================================
        // GRÁFICO A: Barras Horizontais (Total por Cliente)
        // ==========================================
        new Chart(document.getElementById('chart-master-horizontal'), {
            type: 'bar',
            data: {
                labels: labelsC,
                datasets: [{
                    data: dataC,
                    backgroundColor: bgColorsC,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

    } catch (error) {
        console.error("Erro ao renderizar Dashboard Master:", error);
    }
});
