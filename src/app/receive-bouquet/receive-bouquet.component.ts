import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RippleDirective } from '../ripple.directive';
import { SharingService } from '../sharing.service';

@Component({
    selector: 'app-receive-bouquet',
    standalone: true,
    imports: [RouterLink, RippleDirective],
    templateUrl: './receive-bouquet.component.html',
    styleUrl: './receive-bouquet.component.css'
})
export class ReceiveBouquetComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private sharingService: SharingService
    ) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const data = params['d'];
            if (data) {
                this.sharingService.saveReceivedBouquet(data);
            }
        });
    }
}
