import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('tw_theme');
    if (saved === 'light') {
      this.isDark.set(false);
      document.body.classList.add('light-theme');
    }
  }

  toggle(): void {
    const goingDark = !this.isDark();
    this.isDark.set(goingDark);
    if (goingDark) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('tw_theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('tw_theme', 'light');
    }
  }
}
