export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.remove('dark', 'sakura');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    } else if (savedTheme === 'sakura') {
        document.body.classList.add('sakura');
    }
}

export function toggleTheme() {
    let currentTheme = 'light';
    if (document.body.classList.contains('dark')) {
        currentTheme = 'dark';
    } else if (document.body.classList.contains('sakura')) {
        currentTheme = 'sakura';
    }
    let nextTheme = '';
    if (currentTheme === 'light') nextTheme = 'dark';
    else if (currentTheme === 'dark') nextTheme = 'sakura';
    else nextTheme = 'light';
    document.body.classList.remove('dark', 'sakura');
    if (nextTheme === 'dark') document.body.classList.add('dark');
    else if (nextTheme === 'sakura') document.body.classList.add('sakura');
    localStorage.setItem('theme', nextTheme);
}
