import {Component} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs';
// @ts-ignore
declare var gtag;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'TISS';

  constructor(router: Router) {
    const navEndEvents = router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    )
    navEndEvents.subscribe((event:NavigationEnd)=>{
      console.log("versao 04 url presigned-url")
      gtag('config', 'G-DM9E67J8GS',{
        'page_path': event.urlAfterRedirects
      });
    })
  }
}
