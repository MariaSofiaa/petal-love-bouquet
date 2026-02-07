import { Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RippleDirective } from '../ripple.directive';
import { SharingService, DrawingPath } from '../sharing.service';

@Component({
    selector: 'app-create-bouquet',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, RippleDirective],
    templateUrl: './create-bouquet.html',
    styleUrls: ['./create-bouquet.css']
})
export class CreateBouquetComponent implements AfterViewInit {
    @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    private ctx!: CanvasRenderingContext2D;

    songLink: string = '';
    message: string = '';
    currentStep: number = 1;

    // Step 4: Drawing State (Upload disabled for V4 ultra-short links)
    activeMode: 'draw' | 'upload' = 'draw';
    selectedColor: string = '#E31B44';
    brushSize: number = 4;
    colors: string[] = ['#E31B44', '#ED4B92', '#A855F7', '#3B82F6', '#1E293B'];
    isDrawing: boolean = false;

    // V4: Store drawing as paths for extreme compression
    drawingPaths: DrawingPath[] = [];
    private currentPath: DrawingPath | null = null;

    // Success Modal State
    showSuccessModal: boolean = false;
    shareableLink: string = '';
    isLinkCopied: boolean = false;

    constructor(
        private location: Location,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private sharingService: SharingService
    ) { }

    ngAfterViewInit() {
        if (this.currentStep === 4) {
            this.initCanvas();
        }
    }

    setMode(mode: 'draw' | 'upload') {
        // Omitting upload mode for performance and link length as requested
        if (mode === 'upload') {
            console.log('Upload mode disabled in favor of ultra-short drawing links.');
            return;
        }
        this.activeMode = mode;
        if (mode === 'draw') {
            setTimeout(() => this.initCanvas(), 100);
        }
    }

    initCanvas() {
        if (!this.canvasRef) return;
        const canvas = this.canvasRef.nativeElement;
        canvas.width = 800;
        canvas.height = 800;
        this.ctx = canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.selectedColor;
        this.ctx.lineWidth = this.brushSize;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Reset paths on clear
        if (this.drawingPaths.length > 0 && this.isDrawing === false) {
            this.drawingPaths = [];
        }
    }

    startDrawing(event: MouseEvent | TouchEvent) {
        this.isDrawing = true;

        // Start a new path for V4 encoding
        this.currentPath = {
            color: this.selectedColor,
            width: this.brushSize,
            points: []
        };
        this.drawingPaths.push(this.currentPath);

        this.draw(event);
    }

    draw(event: MouseEvent | TouchEvent) {
        if (!this.isDrawing) return;
        event.preventDefault();

        const canvas = this.canvasRef.nativeElement;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let x, y;
        if (event instanceof MouseEvent) {
            x = (event.clientX - rect.left) * scaleX;
            y = (event.clientY - rect.top) * scaleY;
        } else {
            const touch = (event as TouchEvent).touches[0];
            x = (touch.clientX - rect.left) * scaleX;
            y = (touch.clientY - rect.top) * scaleY;
        }

        // V5/V6: Point Pruning - Only record point if it moved significantly
        if (this.currentPath) {
            const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];
            if (!lastPoint || this.getDistance(lastPoint.x, lastPoint.y, x, y) > 10) {
                this.currentPath.points.push({ x, y });
            }
        }

        this.ctx.lineWidth = this.brushSize;
        this.ctx.strokeStyle = this.selectedColor;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    private getDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    stopDrawing() {
        this.isDrawing = false;
        this.currentPath = null;
        if (this.ctx) this.ctx.beginPath();
    }

    clearCanvas() {
        this.drawingPaths = [];
        this.initCanvas();
    }

    goBack() {
        if (this.currentStep > 1) {
            this.currentStep--;
        } else {
            this.router.navigate(['/home']);
        }
    }

    isValidLink(): boolean {
        if (!this.songLink) return false;
        const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com)\/.+$/;
        const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/;
        return spotifyRegex.test(this.songLink) || youtubeRegex.test(this.songLink);
    }

    isValidMessage(): boolean {
        return this.message.trim().length > 0 && this.message.length <= 100;
    }

    async nextStep() {
        if (this.currentStep === 1 && this.isValidLink()) {
            this.currentStep = 2;
        } else if (this.currentStep === 2 && this.isValidMessage()) {
            this.currentStep = 3;
        } else if (this.currentStep === 3) {
            this.currentStep = 4;
            setTimeout(() => this.initCanvas(), 100);
        } else if (this.currentStep === 4) {
            await this.finishBouquet();
        }
    }

    async finishBouquet() {
        const data = {
            s: this.songLink,
            m: this.message,
            paths: this.drawingPaths
        };

        const encodedData = await this.sharingService.encodeBouquet(data);
        this.shareableLink = `${window.location.origin}/receive?d=${encodedData}`;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
    }

    copyLink() {
        if (!this.shareableLink) return;
        navigator.clipboard.writeText(this.shareableLink).then(() => {
            this.isLinkCopied = true;
            setTimeout(() => this.isLinkCopied = false, 2000);
            this.cdr.detectChanges();
        });
    }

    goHome() {
        this.router.navigate(['/home']);
    }

    // Handlers for commented out features (Leaving for V5 reference)
    /*
    handleFileUpload(event: Event) { ... }
    removeUploadedImage() { ... }
    downloadDrawing() { ... }
    */
}
