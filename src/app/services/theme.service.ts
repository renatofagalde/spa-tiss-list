import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = signal(false);

  constructor() {
    const savedTheme = localStorage.getItem('darkMode');

    // Se não há preferência salva, usar dark mode como padrão
    this.darkMode.set(savedTheme ? savedTheme === 'true' : true);
    this.applyTheme();
  }

  isDarkMode() {
    return this.darkMode();
  }

  toggleTheme() {
    this.darkMode.update(current => !current);
    this.applyTheme();
    localStorage.setItem('darkMode', this.darkMode().toString());
  }

  private applyTheme() {
    const body = document.body;
    if (this.darkMode()) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }
}
