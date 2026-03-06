;;; extraction-engine.el --- Org-mode Agenda Metrics Extraction Engine
;;;
;;; Author: Jeremias
;;; Description: Extracts granular LOGBOOK data from agenda files and generates JSONs.
;;; Dependencies: json, org, subr-x (Emacs built-in)

(require 'json)
(require 'org)
(require 'subr-x)

;; Configuration variables (Must be populated by publish.el or init.el)
(defvar clock2json/agenda-files nil
  "List of absolute paths to agenda .org files.")
(defvar clock2json/agenda-main-context "personal"
  "Define the root/main context for the agenda JSON extraction engine.")

;;; ----------------------------------------------------------------------------
;;; UTILITIES (Suckless + GOFAI)
;;; ----------------------------------------------------------------------------


(defun clock2json/generate-color-from-string (str)
  "Generate a consistent HEX color based on the MD5 hash of the string.
  Uses native `secure-hash' to avoid dependency issues."
  (let* ((hash (secure-hash 'md5 (or str "default")))
         ;; Extracts the first 6 characters of the hash to form RRGGBB
         (r (substring hash 0 2))
         (g (substring hash 2 4))
         (b (substring hash 4 6)))
    (format "#%s%s%s" r g b)))

(defun clock2json/get-context-from-file (filepath)
  "Returns the file's base name as context (e.g., .../client1.org -> client1)."
  (file-name-base filepath))

(defun clock2json/ensure-assets-dir (filepath)
  "Ensures that `./assets/data/` exists relative to the file and returns the path."
  (let ((dir (concat (file-name-directory filepath) "assets/data/")))
    (unless (file-exists-p dir)
      (make-directory dir t))
    dir))

(defun clock2json/parse-org-timestamp (ts-str)
  "Converts Org timestamp [YYYY-MM-DD Day HH:MM] to ISO 8601 string (YYYY-MM-DDTHH:MM:00)."
  (when (string-match "\\[\\([0-9-]+\\).*?\\([0-9:]+\\)\\]" ts-str)
    (format "%sT%s:00" (match-string 1 ts-str) (match-string 2 ts-str))))

(defun clock2json/get-duration-minutes (start-iso end-iso)
  "Calculate the difference in minutes between two ISO timestamps."
  (let ((t1 (date-to-time start-iso))
        (t2 (date-to-time end-iso)))
    (round (/ (float-time (time-subtract t2 t1)) 60))))

(defun clock2json/write-json-file (data filepath)
  "Write the alist DATA as JSON to FILEPATH."
  (with-temp-file filepath
    (insert (json-encode data))))

;;; ----------------------------------------------------------------------------
;;; Extraction (CORE)
;;; ----------------------------------------------------------------------------

(defun clock2json/extract-entries-from-buffer (target-month)
  "Scans the current buffer for LOGBOOK entries within TARGET-MONTH (YYYY-MM).
  Returns a list of objects (alists) ready for JSON."
  (let ((entries '()))
    (org-map-entries
     (lambda ()
       (let* ((heading (org-get-heading t t t t))
              (tags (org-get-tags))
              (todo (org-get-todo-state))
              (effort (org-entry-get (point) "EFFORT"))
              (mov-id (org-entry-get (point) "TICKET_ID"))
              ;; Local iteration context
              (entry-data nil))
         
         ;; Proactive search for CLOCKs within this entry's LOGBOOK
         (save-excursion
           ;; 1. Try to find the LOGBOOK drawer
           ;; FIX: Use org-entry-end-position to limit the search to the current node only,
           ;; ignoring children/subtasks to avoid time duplication.
           (when (re-search-forward ":LOGBOOK:" (save-excursion (org-entry-end-position)) t)
             (let ((drawer-end (save-excursion (re-search-forward ":END:" nil t))))
               ;; 2. Iterate over CLOCK lines within the drawer
               (while (re-search-forward "^[ \t]*CLOCK: \\(\\[.*?\\]\\)--\\(\\[.*?\\]\\)" drawer-end t)
                 (let* ((raw-start (match-string 1))
                        (raw-end (match-string 2))
                        (iso-start (clock2json/parse-org-timestamp raw-start))
                        (iso-end (clock2json/parse-org-timestamp raw-end)))
                   
                   ;; 3. Current Month Filter
                   (when (and iso-start 
                              (string-prefix-p target-month iso-start))
                     
                     (push (list (cons "task" heading)
                                 (cons "id" (or mov-id ""))
                                 (cons "start" iso-start)
                                 (cons "end" iso-end)
                                 (cons "duration_minutes" (clock2json/get-duration-minutes iso-start iso-end))
                                 (cons "tags" tags)
                                 (cons "todo_state" (or todo ""))
                                 (cons "effort" (or effort "")))
                           entries))))))))))
    entries))

(defun clock2json/calculate-summary (entries context target-month)
  "Aggregate the raw data to generate the summary file."
  (let ((total 0)
        (by-tag (make-hash-table :test 'equal))
        (by-status (make-hash-table :test 'equal)))
    
    (dolist (e entries)
      (let ((dur (cdr (assoc "duration_minutes" e)))
            (tags (cdr (assoc "tags" e)))
            (status (cdr (assoc "todo_state" e))))
        
        ;; Accumulates grand total
        (setq total (+ total dur))
        
        ;; Accumulates status
        (when status
          (puthash status (+ dur (gethash status by-status 0)) by-status))
        
        ;; Accumulates tag
        (dolist (tag tags)
          (puthash tag (+ dur (gethash tag by-tag 0)) by-tag))))
    
    ;; Build return objects
    (list (cons "context" context)
          (cons "period" target-month)
          (cons "total_minutes" total)
          (cons "color" (clock2json/generate-color-from-string context))
          (cons "by_tag" by-tag)
          (cons "by_status" by-status))))

;;; ----------------------------------------------------------------------------
;;; Core function (orchestrator)
;;; ----------------------------------------------------------------------------

(defun clock2json/agenda-extract-metrics (&optional target-month)
  "Extracts metrics from all files in clock2json/agenda-files.
  If TARGET-MONTH (YYYY-MM) is not provided, the system's current month is used."
  (interactive)
  ;; Default corrent month if nil 
  (unless target-month
    (setq target-month (format-time-string "%Y-%m")))
  
  (message ">>> Starting extraction Schedule to: %s" target-month)
  
  (let ((global-summaries '())
        (global-entries '())
        (index-assets-dir nil))
    
    ;; 1. Local process
    (dolist (file clock2json/agenda-files)
      (if (file-exists-p file)
          (with-current-buffer (find-file-noselect file)
            (let* ((context (clock2json/get-context-from-file file))
                   (assets-dir (clock2json/ensure-assets-dir file))
                   ;; Extraction
                   (entries (clock2json/extract-entries-from-buffer target-month))
                   (summary (clock2json/calculate-summary entries context target-month)))
              
              ;; Build local jsons
              (clock2json/write-json-file entries 
                                          (expand-file-name (format "%s-%s.json" context target-month) assets-dir))
              (clock2json/write-json-file summary 
                                          (expand-file-name (format "%s-%s-summary.json" context target-month) assets-dir))
              
              ;; Accumulates for global
              (push summary global-summaries)
              
              ;; FIX: "Global Enrichment (Contextualization, ID Stripping)"
              (let ((context-entries 
                     (mapcar (lambda (entry)
                               (let ((new-entry (copy-alist entry)))
                                 (setq new-entry (assoc-delete-all "id" new-entry))
                                 (push (cons "context" context) new-entry)
                                 new-entry))
                             entries)))
                (setq global-entries (append global-entries context-entries)))
              
              ;; Specifies where to save the Global Dashboard.
	      ;; This must match the name of the .org file corresponding to the HTML page
	      ;; you intend to use as the global dashboard.
              (when (string= context clock2json/agenda-main-context)
                (setq index-assets-dir assets-dir))
              
              (message "[OK] %s: %d processed entryes." context (length entries))))
        (message "[Warning] ignored file (not found): %s" file)))
    
    ;; 2. Global Processing (Only if Index exists)
    (if index-assets-dir
        (let ((global-data (list (cons "period" target-month)
                                 (cons "generated_at" (format-time-string "%Y-%m-%dT%H:%M:%S"))
                                 (cons "summaries" global-summaries)
                                 (cons "all_entries" global-entries))))
          (clock2json/write-json-file global-data 
                                      (expand-file-name (format "global-dashboard-%s.json" target-month) index-assets-dir))
          (message ">>> Global Dashboard generated successfully at: %s" index-assets-dir))
      (message "[ALERT] File 'pessoal.org' not found. Global Dashboard not generated."))))

;;; Scratch use example:
;; (load "~/src/teste-agenda/agenda/publish/extraction-engine.el")
;; (setq clock2json/agenda-files '("~/src/teste-agenda/agenda/www/pessoal/index.org" ...))
;; (clock2json/agenda-extract-metrics "2026-02")
