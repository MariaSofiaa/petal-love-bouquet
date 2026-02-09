import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RippleDirective } from '../ripple.directive';
import { SharingService } from '../sharing.service';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink, RippleDirective, NgIf],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    hasStoredBouquet = false;

    constructor(private sharingService: SharingService) { }

    ngOnInit() {
        this.hasStoredBouquet = !!this.sharingService.getStoredReceivedBouquet();
    }
}
