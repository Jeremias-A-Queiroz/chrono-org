;;; chrono-org-publish.el --- Configurações de Publicação para o Projeto Chrono-Org

;; Requer o pacote de publicação do Org-mode
(require 'ox-publish)

(setq org-html-head-include-default-style nil)
(setq org-html-body-container-element nil) ; Opcional, mas recomendado para controle total do layout

;; Inclusão de CSS e Lógica de Tema
(setq org-html-head
      (concat
       "<script>
         (function() {
           var localTheme = localStorage.getItem('theme-preference');
           var sysTheme = window.matchMedia('(prefers-color-scheme: light)').matches;
           if (localTheme === 'light' || (!localTheme && sysTheme)) {
             document.documentElement.classList.add('light-theme');
           }
         })();
       </script>\n"
       ;; Caminhos corrigidos para serem absolutos à raiz do *subsite* "/agenda/"
       "<link rel=\"stylesheet\" type=\"text/css\" href=\"/agenda/assets/css/style.css\" />\n"
       "<script src=\"/agenda/assets/js/theme-switcher.js\" type=\"text/javascript\" defer=\"defer\"></script>"))


;; Configuração para o link de validação XHTML (mantido como no exemplo)
(setq org-html-validation-link "<a href=\"https://validator.w3.org/check?uri=https%3A%2F%2Fwww.infralinux.com.br%2F\"><img
      src=\"https://www.w3.org/Icons/valid-xhtml10\" alt=\"Valid XHTML 1.0 Strict\" height=\"31\" width=\"88\" /></a>")

;; Definição da lista de projetos de publicação
(setq org-publish-project-alist
      '(
	;; 1. Publica todos os arquivos .org do projeto Agenda para HTML
	("chrono-org-pages"
	 :base-directory "~/Trabalho/Agenda/"           ; Diretório raiz dos seus arquivos .org
	 :base-extension "org"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/" ; Diretório de destino no VPS
	 :recursive t                                   ; Publica subdiretórios recursivamente
	 :publishing-function org-html-publish-to-html  ; Função para converter Org para HTML
	 :auto-sitemap t                                ; Gera sitemap automaticamente
	 :sitemap-style list                            ; Estilo de lista para o sitemap
	 :sitemap-filename "sitemap.org"                ; Nome do arquivo sitemap
	 :author "Jeremias Alves Queiroz"               ; Seu nome
	 :email "jeremias@redes.eti.br"                 ; Seu email
	 :with-creator t                                ; Inclui o gerador (Org-mode) no HTML
	 :with-timestamps t                             ; Inclui timestamps (data de criação/modificação)
         :with-deadline t                               ; Inclui DEADLINE property
         :with-scheduled t                              ; Inclui SCHEDULED property
	 )

	;; 2. Publica os arquivos CSS globais
	("chrono-org-css"
	 :base-directory "~/src/chrono-org/assets/css/" ; Diretório local do CSS
	 :base-extension "css"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/assets/css" ; Destino: raiz/assets/css/
	 :publishing-function org-publish-attachment    ; Copia o arquivo como está
	 :recursive t                                   ; Em caso de múltiplos arquivos/subdiretórios CSS
	 )

	;; 3. Publica os arquivos JavaScript globais
	("chrono-org-js"
	 :base-directory "~/src/chrono-org/assets/js/"  ; Diretório local do JS
	 :base-extension "js"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/assets/js" ; Destino: raiz/assets/js/
	 :publishing-function org-publish-attachment    ; Copia o arquivo como está
	 :recursive t                                   ; Em caso de múltiplos arquivos/subdiretórios JS
	 )

	;; 4. Publica os arquivos JSON de dados, mantendo a hierarquia
	("chrono-org-data-json"
	 :base-directory "~/Trabalho/Agenda/"           ; Mesma base das páginas Org, para espelhar a estrutura
	 :base-extension "json"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/" ; Mesma raiz das páginas Org
	 :publishing-function org-publish-attachment    ; Copia o arquivo como está
	 :recursive t                                   ; ESSENCIAL para copiar todos os JSONs em subdiretórios
	 )

	;; 5. Publica arquivos de imagem (exemplo, ajuste o caminho base conforme necessário)
	("chrono-org-images"
	 :base-directory "~/src/chrono-org/assets/img/" ; Diretório local das imagens
	 :base-extension "jpg\\|gif\\|png\\|svg"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/assets/img" ; Destino: raiz/assets/img/
	 :publishing-function org-publish-attachment
	 :recursive t
	 )

	;; 6. Componente para publicar todos os outros componentes
	("chrono-org-all" :components ("chrono-org-pages" "chrono-org-css" "chrono-org-js" "chrono-org-data-json" "chrono-org-images"))
	))

;; Fornece uma mensagem para que o Emacs saiba que o arquivo foi carregado
(provide 'chrono-org-publish)

;;; chrono-org-publish.el ends here
