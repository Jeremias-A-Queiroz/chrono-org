# Roadmap do Projeto Chrono-Org

Este documento consolida as decisões arquiteturais e as tarefas pendentes para a implementação do sistema de publicação de agenda, dashboards e arquivamento histórico.

## 1. Visão Geral e Arquitetura

O objetivo é criar um fluxo de publicação "suckless" para o gerenciamento de tarefas pessoais e profissionais, utilizando Org-mode, Chart.js para dashboards e um sistema de arquivamento mensal.


---

## 2. Tarefas Pendentes
- [X] Criar arquivos de exemplo;
- [X] Criar links de navegação padrão do ORG;
- [X] Criar uma estratégia consistente de arquivos `.htaccess`;
- [X] Criar README.md do projeto.
---

## 3. Notas Técnicas Importantes

1.  **Filosofia Suckless**: Evitar automações complexas para reescrita de links HTML. Aceita-se que links em páginas históricas apontem para a versão "current" a menos que editados manualmente no `.org` arquivado.
2.  **Dashboards**: Os arquivos JSON já são gerados com data. A cópia simples para a pasta `archives/` correspondente deve manter os dashboards funcionais nas páginas históricas.
3.  **Deploy**: O caminho de deploy final é `/scp:infrasrv:/var/www/html/www/public-html/agenda/`.

---
*Gerado em 06/03/2026*
