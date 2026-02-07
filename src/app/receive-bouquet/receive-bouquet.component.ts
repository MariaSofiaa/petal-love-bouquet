import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RippleDirective } from '../ripple.directive';

@Component({
    selector: 'app-receive-bouquet',
    standalone: true,
    imports: [RouterLink, RippleDirective],
    templateUrl: './receive-bouquet.component.html',
    styleUrl: './receive-bouquet.component.css'
})
export class ReceiveBouquetComponent implements OnInit {
    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            console.log('ReceiveBouquet: Query parameters:', params);
        });
    }
}
