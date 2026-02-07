import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RippleDirective } from '../ripple.directive';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterLink, RippleDirective],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent {

}
