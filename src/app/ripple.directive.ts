import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appRipple]',
    standalone: true
})
export class RippleDirective {
    constructor(private el: ElementRef, private renderer: Renderer2) {
        this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
        this.renderer.setStyle(this.el.nativeElement, 'overflow', 'hidden');
    }

    @HostListener('mousedown', ['$event'])
    @HostListener('touchstart', ['$event'])
    onPress(event: MouseEvent | TouchEvent) {
        // Prevent ripple on touch if it's followed by a mouse event (common in mobile)
        // Note: touchstart can trigger without preventDefault, and click will follow.
        // We just want to ensure we don't create two ripples.

        const circle = this.renderer.createElement('span');
        const diameter = Math.max(this.el.nativeElement.clientWidth, this.el.nativeElement.clientHeight);
        const radius = diameter / 2;

        const rect = this.el.nativeElement.getBoundingClientRect();

        // Get coordinates for either mouse or touch
        let clientX: number;
        let clientY: number;

        if (event instanceof MouseEvent) {
            clientX = event.clientX;
            clientY = event.clientY;
        } else {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        const x = clientX - rect.left - radius;
        const y = clientY - rect.top - radius;

        this.renderer.setStyle(circle, 'width', `${diameter}px`);
        this.renderer.setStyle(circle, 'height', `${diameter}px`);
        this.renderer.setStyle(circle, 'left', `${x}px`);
        this.renderer.setStyle(circle, 'top', `${y}px`);
        this.renderer.addClass(circle, 'ripple');

        // Remove old ripples to avoid clutter
        const existingRipples = this.el.nativeElement.querySelectorAll('.ripple');
        existingRipples.forEach((r: any) => this.renderer.removeChild(this.el.nativeElement, r));

        this.renderer.appendChild(this.el.nativeElement, circle);

        // Clean up after animation
        setTimeout(() => {
            if (circle.parentNode === this.el.nativeElement) {
                this.renderer.removeChild(this.el.nativeElement, circle);
            }
        }, 600);
    }
}
