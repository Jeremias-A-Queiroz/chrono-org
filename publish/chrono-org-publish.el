;;; chrono-org-publish.el --- Publishing Configurations for the Chrono-Org Project

;; Requires the Org-mode publishing package
(require 'ox-publish)

(setq org-html-head-include-default-style nil)
(setq org-html-body-container-element nil) ; Optional, but recommended for full layout control


;; CSS Inclusion and Theme Logic
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
       ;; Paths corrected to be absolute to the root of the "/agenda/" subsite
       "<link rel=\"stylesheet\" type=\"text/css\" href=\"/agenda/assets/css/style.css\" />\n"
       "<script src=\"/agenda/assets/js/theme-switcher.js\" type=\"text/javascript\" defer=\"defer\"></script>"))


;; Configuration for the XHTML validation link (kept as in the example)
(setq org-html-validation-link "<a href=\"https://validator.w3.org/check?uri=https%3A%2F%2Fwww.infralinux.com.br%2F\"><img
      src=\"https://www.w3.org/Icons/valid-xhtml10\" alt=\"Valid XHTML 1.0 Strict\" height=\"31\" width=\"88\" /></a>")

;; Wrapper to append -YYYY-MM suffix to generated HTML files
(defun chrono-org-publish-versioned-html (plist filename pub-dir)
  "Publish Org to HTML and append current -YYYY-MM to filename, except for index and sitemap."
  (let* ((published-file (org-html-publish-to-html plist filename pub-dir))
         (basename (file-name-base filename))
         (month-suffix (format-time-string "-%Y-%m"))
         (target-filename (concat basename month-suffix ".html"))
         (new-filepath (expand-file-name target-filename pub-dir)))
    (when (and published-file
               (not (member basename '("index" "sitemap")))
               (file-exists-p published-file))
      (rename-file published-file new-filepath t)
      (setq published-file new-filepath))
    published-file))

;; Definition of the list of publication projects
(setq org-publish-project-alist
      `(
	;; 1. Export all .org files from the Agenda project to HTML
	("chrono-org-pages"
	 :base-directory "~/Trabalho/Agenda/"           ; .org root dir
	 :base-extension "org"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/" ; VPS final path 
	 :recursive t                                   ;  Recursive publish dirs
	 :publishing-function chrono-org-publish-versioned-html  ; Custom wrapper function
	 :auto-sitemap t                                ; auto-sitemap t or nil
	 :sitemap-style list                            ; sitemap style
	 :sitemap-filename "sitemap.org"                
	 :author "Jeremias Alves Queiroz"               
	 :email "jeremias@redes.eti.br"                 
	 :with-creator t                                ; Include Org-mode generation info in HTML
	 :with-timestamps t                             ; Include timestamps 
         :with-deadline t                               ; Include DEADLINE property
         :with-scheduled t                              ; Include SCHEDULED property
	 )

	;; 2. Publish global css style
	("chrono-org-css"
	 :base-directory "~/src/chrono-org/assets/css/" ; Local style dir
	 :base-extension "css"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/assets/css" ; css style final path
	 :publishing-function org-publish-attachment    ; Copy as is
	 :recursive t                                   ; recursive copy
	 )

	;; 3. Publish global javascript
	("chrono-org-js"
	 :base-directory "~/src/chrono-org/assets/js/"  ; Local JS dir
	 :base-extension "js"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/assets/js" ; JS final path
	 :publishing-function org-publish-attachment    ; Copy as is
	 :recursive t                                   ; Recursive copy
	 )

	;; 4. Publishes data JSON files and .htaccess, maintaining the hierarchy
	("chrono-org-data-json"
	  :base-directory "~/Trabalho/Agenda/"           ; Same base as Org pages, to mirror the structure
	  :base-extension "json"
	  :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/" ; Same root of Org pages
	  :publishing-function org-publish-attachment    ; copy as is
	  :recursive t                                   ; recursive copy
	  :include ,cop/agenda-security-files)

	;; 5. Publish image files (e.g., adjust base path as needed)
	("chrono-org-images"
	 :base-directory "~/src/chrono-org/assets/img/" ; Images local path
	 :base-extension "jpg\\|gif\\|png\\|svg"
	 :publishing-directory "/scp:infrasrv:/var/www/html/www/public-html/agenda/assets/img" ; Images final path
	 :publishing-function org-publish-attachment
	 :recursive t
	 )

	;; 6. Component for publishing all other components
	("chrono-org-all" :components ("chrono-org-pages" "chrono-org-css" "chrono-org-js" "chrono-org-data-json" "chrono-org-images"))
	))

;; Provides a message to indicate the file has been loaded
(provide 'chrono-org-publish)

;;; chrono-org-publish.el ends here
