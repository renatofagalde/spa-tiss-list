import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',  // ← Corrigir para este
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'spa-tiss-list';
}
