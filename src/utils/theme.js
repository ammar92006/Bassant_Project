/**
 * theme.js - Global Light/Dark Mode Manager
 * Handles logic for toggling and persisting user theme choice across pages.
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const rootItem = document.body; // we apply class to body
    
    // Load preference from local storage
    const currentTheme = localStorage.getItem('bloomyTheme');
    
    // Check if the user previously selected light mode
    if (currentTheme === 'light') {
        rootItem.classList.add('light-mode');
        if(themeToggle) themeToggle.textContent = '☀️';
    } else {
        // Default is dark mode
        if(themeToggle) themeToggle.textContent = '🌙';
    }
    
    // Listen for toggle click
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isLightMode = rootItem.classList.toggle('light-mode');
            
            if (isLightMode) {
                // Switch icon to sun
                themeToggle.textContent = '☀️';
                localStorage.setItem('bloomyTheme', 'light');
            } else {
                // Switch icon to moon
                themeToggle.textContent = '🌙';
                localStorage.setItem('bloomyTheme', 'dark');
            }
        });
    }
});
