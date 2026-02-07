import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RippleDirective } from '../ripple.directive';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink, RippleDirective],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent { }
