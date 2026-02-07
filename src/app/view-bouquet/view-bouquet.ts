import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RippleDirective } from '../ripple.directive';
import { NgIf, NgFor } from '@angular/common';
import { SharingService, DrawingPath } from '../sharing.service';

interface FlowerContent {
  id: number;
  title: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-view-bouquet',
  standalone: true,
  imports: [RouterLink, RippleDirective, NgIf, NgFor],
  templateUrl: './view-bouquet.html',
  styleUrl: './view-bouquet.css',
})
export class ViewBouquetComponent implements OnInit, AfterViewChecked {
  @ViewChild('viewCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  isModalOpen = false;
  isClosing = false;
  activeFlower: FlowerContent | null = null;

  bouquetData: { s: string; m: string; i?: string | null; paths?: DrawingPath[] } | null = null;
  private canvasRendered = false;

  // Puzzle State
  puzzlePieces: number[] = [];
  selectedPieceIndex: number | null = null;
  isPuzzleSolved = false;

  flowers: FlowerContent[] = [
    {
      id: 1,
      title: 'Our Song',
      icon: '/assets/flower-pink-cosmos.png',
      description: 'Listening to our favorite melody...'
    },
    {
      id: 2,
      title: 'A Message',
      icon: '/assets/flower-red-hibiscus.png',
      description: 'Reading your sweet words...'
    },
    {
      id: 3,
      title: 'A Little Surprise',
      icon: '/assets/flower-pink-tulip.png',
      description: 'Solving the puzzle of our love...'
    },
    {
      id: 4,
      title: 'Bright Daisy',
      icon: '/assets/flower-white-daisy.png',
      description: 'Looking at your special drawing...'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private sharingService: SharingService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      const encodedData = params['d'];
      console.log('ViewBouquet: Encoded data from URL:', encodedData);
      if (encodedData) {
        this.bouquetData = await this.sharingService.decodeBouquet(encodedData);
        console.log('ViewBouquet: Decoded bouquet data:', this.bouquetData);
      } else {
        console.warn('ViewBouquet: No data parameter found in URL');
      }
    });
  }

  ngAfterViewChecked() {
    // If modal is open and we have paths but haven't rendered yet
    if (this.isModalOpen && this.activeFlower?.id === 4 && this.canvasRef && !this.canvasRendered) {
      this.renderDrawing();
      this.canvasRendered = true;
    }
  }

  openModal(flowerId: number) {
    this.activeFlower = this.flowers.find(f => f.id === flowerId) || null;
    if (this.activeFlower) {
      if (flowerId === 3) {
        this.initializePuzzle();
      }
      this.isModalOpen = true;
      this.canvasRendered = false; // Reset for drawing step
    }
  }

  renderDrawing() {
    if (!this.canvasRef || !this.bouquetData?.paths) return;
    const canvas = this.canvasRef.nativeElement;
    // Match the creator's resolution
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const path of this.bouquetData.paths) {
      if (path.points.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  }

  initializePuzzle() {
    this.isPuzzleSolved = false;
    this.selectedPieceIndex = null;
    const pieces = [0, 1, 2, 3];
    do {
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
    } while (this.isArraySolved(pieces));

    this.puzzlePieces = pieces;
  }

  onPieceClick(index: number) {
    if (this.isPuzzleSolved) return;

    if (this.selectedPieceIndex === null) {
      this.selectedPieceIndex = index;
    } else {
      const temp = this.puzzlePieces[this.selectedPieceIndex];
      this.puzzlePieces[this.selectedPieceIndex] = this.puzzlePieces[index];
      this.puzzlePieces[index] = temp;

      this.selectedPieceIndex = null;
      this.checkWinCondition();
    }
  }

  checkWinCondition() {
    if (this.isArraySolved(this.puzzlePieces)) {
      this.isPuzzleSolved = true;
    }
  }

  private isArraySolved(arr: number[]): boolean {
    return arr.every((val, index) => val === index);
  }

  closeModal() {
    this.isClosing = true;
    setTimeout(() => {
      this.isModalOpen = false;
      this.isClosing = false;
      this.activeFlower = null;
      this.canvasRendered = false;
    }, 300);
  }
}
