/**
 * Theme Switcher for Fotografia Analógica Website
 *
 * This script handles the logic for toggling between a dark (default)
 * and a light theme, and persists the user's choice across sessions
 * using the browser's localStorage.
 */
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleButton = document.getElementById('theme-toggle');
  const localStorageKey = 'theme-preference';

  /**
   * Applies the specified theme by adding or removing the 'light-theme' class
   * from the body element.
   * @param {string} theme - The theme to apply ('dark' or 'light').
   */
    const applyTheme = (theme) => {
	// Alvo agora é documentElement (tag html), não body
	document.documentElement.classList.toggle('light-theme', theme === 'light');
    };

    const toggleTheme = () => {
	// 1. Adiciona classe de transição para animar suavemente SÓ AGORA
	document.documentElement.classList.add('transitioning');

	// 2. Lógica de troca
	const isLightTheme = document.documentElement.classList.contains('light-theme');
	const newTheme = isLightTheme ? 'dark' : 'light';
  
	applyTheme(newTheme);
	localStorage.setItem(localStorageKey, newTheme);

	// 3. Remove classe de transição após o efeito acabar (limpeza)
	setTimeout(() => {
	    document.documentElement.classList.remove('transitioning');
	}, 300); 
    };

  /**
   * Determines the initial theme based on saved preference or system settings.
   * Priority:
   * 1. User's saved preference in localStorage.
   * 2. User's OS-level preference (prefers-color-scheme).
   * 3. Default to 'dark' if nothing is set.
   */
  const initializeTheme = () => {
    const savedTheme = localStorage.getItem(localStorageKey);
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    if (savedTheme) {
      // Use the saved theme if it exists
      applyTheme(savedTheme);
    } else if (systemPrefersLight) {
      // Otherwise, respect the OS preference
      applyTheme('light');
    } else {
      // Default to dark theme
      applyTheme('dark');
    }
  };

  // --- SCRIPT EXECUTION ---

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleTheme);
  } else {
    console.warn('Theme toggle button with id "theme-toggle" not found.');
  }

  // Set the initial theme as soon as the DOM is ready
  initializeTheme();
});
