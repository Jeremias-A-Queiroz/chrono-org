# Roadmap do Projeto Chrono-Org

Este documento consolida as decisões arquiteturais e as tarefas pendentes para a implementação do sistema de publicação de agenda, dashboards e arquivamento histórico.

## 1. Visão Geral e Arquitetura

O objetivo é criar um fluxo de publicação "suckless" para o gerenciamento de tarefas pessoais e profissionais, utilizando Org-mode, Chart.js para dashboards e um sistema de arquivamento mensal.

### Estrutura de Diretórios (Local vs. Remoto)

**Local (`~/Trabalho/Agenda/`)**
```text
~/Trabalho/Agenda/
├── index.org                   # Front-page (Índice geral)
├── current/                    # Agenda Ativa (Editada diariamente)
│   ├── pessoal.org
│   ├── pessoal/
│   │   └── assets/data/        # JSONs gerados
│   └── unimed/
│       └── ...
└── archives/                   # Agenda Histórica (Congelada)
    ├── pessoal/
    │   ├── pessoal-2026-01.org
    │   └── assets/data/        # JSONs datados
    └── ...
```

**Remoto/Deploy (`/var/www/html/www/public-html/agenda/`)**
```text
/agenda/
├── index.html                  # Front-page
├── assets/                     # Assets Globais (CSS, JS, Img)
│   ├── css/style.css
│   └── js/ (chart.js, dashboard.js, etc.)
├── current/                    # Versão HTML da Agenda Ativa
│   ├── pessoal.html
│   └── ...
└── archives/                   # Versão HTML das Agendas Históricas
    ├── pessoal/
    │   ├── pessoal-2026-01.html
    │   └── ...
    └── ...
```

---

## 2. Tarefas Pendentes

### Fase 1: Reestruturação Local
- [ ] **Mover arquivos atuais**: Criar o diretório `~/Trabalho/Agenda/current/` e mover toda a estrutura ativa (orgs e subdiretórios de clientes) para lá.
- [ ] **Criar diretório de arquivos**: Criar `~/Trabalho/Agenda/archives/`.
- [ ] **Criar Index**: Criar `~/Trabalho/Agenda/index.org` servindo como portal de entrada, com links manuais para `current/` e listas de `archives/`.

### Fase 2: Automação de Arquivamento (Elisp)
- [ ] **Desenvolver `jm/archive-agenda-files`**:
    - Script deve rodar sob demanda (rollout mensal).
    - Iterar sobre arquivos `.org` em `current/`.
    - Copiar (cp) para `archives/` mantendo a estrutura de pastas.
    - Renomear o destino adicionando sufixo do mês anterior (ex: `pessoal.org` -> `pessoal-2026-03.org`).
    - *Nota:* A limpeza dos arquivos originais em `current/` será **manual** (C-c C-x C-a).

### Fase 3: Configuração de Publicação (`chrono-org-publish.el`)
Refatorar completamente o arquivo de configuração para suportar a nova topologia.

- [ ] **Componente `chrono-org-root`**:
    - Publicar `index.org` da raiz para `/agenda/index.html`.
- [ ] **Componente `chrono-org-pages-current`**:
    - Base: `~/Trabalho/Agenda/current/` -> Destino: `/agenda/current/`.
- [ ] **Componente `chrono-org-pages-historical`**:
    - Base: `~/Trabalho/Agenda/archives/` -> Destino: `/agenda/archives/`.
- [ ] **Componentes de Dados (JSON)**:
    - *Crucial:* Configurar `org-publish-attachment` recursivo para copiar `.json` tanto de `current/` quanto de `archives/` para seus respectivos destinos, garantindo que os dashboards encontrem seus dados.
- [ ] **Componentes de Assets Globais**:
    - CSS/JS/Img publicados em `/agenda/assets/`.
- [ ] **Configuração do HTML Head**:
    - Definir `org-html-head` usando **caminhos absolutos ao subsite**:
        - `/agenda/assets/css/style.css`
        - `/agenda/assets/js/chart.js`
    - Garantir `(setq org-html-head-include-default-style nil)`.

### Fase 4: Ajustes Finos e Validação
- [X] **Correção CSS**: Verificar se a classe `.row` foi adicionada ao `style.css` global (necessário para o layout do dashboard).
- [X] **Correção JS**: Verificar a lógica de acumulação no `dashboard-master.js` (evitar sobrescrita de contextos duplicados como 'kammoldes').
- [ ] **Workflow Manual**: Validar o processo de atualizar links internos nos arquivos históricos (ex: editar `pessoal-2026-03.org` para apontar para `outro-2026-03.org`).

---

## 3. Notas Técnicas Importantes

1.  **Filosofia Suckless**: Evitar automações complexas para reescrita de links HTML. Aceita-se que links em páginas históricas apontem para a versão "current" a menos que editados manualmente no `.org` arquivado.
2.  **Dashboards**: Os arquivos JSON já são gerados com data. A cópia simples para a pasta `archives/` correspondente deve manter os dashboards funcionais nas páginas históricas.
3.  **Deploy**: O caminho de deploy final é `/scp:infrasrv:/var/www/html/www/public-html/agenda/`.

---
*Gerado em 04/03/2026*
