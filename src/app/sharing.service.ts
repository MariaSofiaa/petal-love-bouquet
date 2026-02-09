import { Injectable } from '@angular/core';

export interface DrawingPath {
    color: string;
    width: number;
    points: { x: number, y: number }[];
}

@Injectable({
    providedIn: 'root'
})
export class SharingService {
    // Predefined palette for path encoding (must match between creator and viewer)
    readonly palette = ['#E31B44', '#ED4B92', '#A855F7', '#3B82F6', '#1E293B'];

    constructor() { }

    saveReceivedBouquet(encoded: string) {
        if (!encoded) return;
        try {
            localStorage.setItem('received_bouquet', encoded);
            console.log('SharingService: Saved bouquet to storage');
        } catch (e) {
            console.error('SharingService: Error saving to localStorage', e);
        }
    }

    getStoredReceivedBouquet(): string | null {
        try {
            return localStorage.getItem('received_bouquet');
        } catch (e) {
            console.error('SharingService: Error reading from localStorage', e);
            return null;
        }
    }

    /**
     * Encodes bouquet data + Vector Drawing Paths into an ultra-short V4 string.
     */
    async encodeBouquet(data: { s: string; m: string; paths?: DrawingPath[] }): Promise<string> {
        try {
            console.log('SharingService: Encoding Vector V4 data...');
            const encoder = new TextEncoder();

            const shortenedSong = this.shortenUrlContent(data.s);
            const sBytes = encoder.encode(shortenedSong);
            const mBytes = encoder.encode(data.m);
            // 1. Filter and Simplify Paths (V6)
            const paths = (data.paths || [])
                .filter(p => p.points.length >= 2) // Skip dots
                .map(p => ({
                    ...p,
                    points: this.simplifyPath(p.points, 2.5) // Prune redundant linear points
                }));

            // 2. Calculate size for drawing data
            let drawingSize = 1; // Path count
            for (const path of paths) {
                drawingSize += 1; // Color + Width byte
                drawingSize += 2; // Point count
                drawingSize += path.points.length * 2; // X, Y pairs
            }

            const totalSize = 1 + 1 + sBytes.length + 2 + mBytes.length + drawingSize;
            const buffer = new Uint8Array(totalSize);

            let offset = 0;
            buffer[offset++] = 4; // Version 4 (Vector)

            // Song URL
            buffer[offset++] = sBytes.length & 0xff;
            buffer.set(sBytes, offset);
            offset += sBytes.length;

            // Message
            buffer[offset++] = (mBytes.length >> 8) & 0xff;
            buffer[offset++] = mBytes.length & 0xff;
            buffer.set(mBytes, offset);
            offset += mBytes.length;

            // Drawing Paths
            buffer[offset++] = Math.min(paths.length, 255);
            for (let i = 0; i < Math.min(paths.length, 255); i++) {
                const path = paths[i];
                const colorIdx = this.palette.indexOf(path.color);
                const safeColorIdx = colorIdx === -1 ? 0 : colorIdx;
                const safeWidth = Math.min(Math.floor(path.width), 15);

                // 1 byte: 4 bits color index | 4 bits brush width
                buffer[offset++] = (safeColorIdx << 4) | safeWidth;

                // 2 bytes: Point count
                const pLen = Math.min(path.points.length, 65535);
                buffer[offset++] = (pLen >> 8) & 0xff;
                buffer[offset++] = pLen & 0xff;

                // Points: Quantize 800x800 -> 255x255 (1 byte per coord)
                for (let j = 0; j < pLen; j++) {
                    const p = path.points[j];
                    buffer[offset++] = Math.min(Math.floor((p.x / 800) * 255), 255);
                    buffer[offset++] = Math.min(Math.floor((p.y / 800) * 255), 255);
                }
            }

            // Compress using Zlib (deflate)
            const compressedStream = new Blob([buffer]).stream().pipeThrough(new CompressionStream('deflate'));
            const compressedResponse = new Response(compressedStream);
            const compressedBuffer = await compressedResponse.arrayBuffer();
            const compressedBytes = new Uint8Array(compressedBuffer);

            const binString = Array.from(compressedBytes, (byte) => String.fromCharCode(byte)).join("");
            const base64 = btoa(binString);
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (e) {
            console.error('SharingService: Error encoding V4 bouquet data:', e);
            return '';
        }
    }

    /**
     * Decodes V4 (Vector), V3 (Zlib), V2 (Gzip), V1 or Legacy.
     */
    async decodeBouquet(encoded: string): Promise<{ s: string; m: string; i?: string | null; paths?: DrawingPath[] } | null> {
        try {
            let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';

            const binString = atob(base64);
            const compressedBytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));

            // Try Deflate (V3, V4)
            try {
                const decompressedStream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream('deflate'));
                const decompressedResponse = new Response(decompressedStream);
                const decompressedBuffer = await decompressedResponse.arrayBuffer();
                const buffer = new Uint8Array(decompressedBuffer);

                if (buffer[0] === 4) return this.unpackProtocolV4(buffer);
                if (buffer[0] === 3) return this.unpackProtocolV3(buffer);
            } catch (v4error) { }

            // Try GZIP (V1, V2)
            try {
                const decompressedStream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
                const decompressedResponse = new Response(decompressedStream);
                const decompressedBuffer = await decompressedResponse.arrayBuffer();
                const buffer = new Uint8Array(decompressedBuffer);

                if (buffer[0] === 2) return this.unpackProtocolV2(buffer);
                if (buffer[0] === 1) return this.unpackProtocolV1(buffer);
            } catch (gzipError) { }

            return this.decodeBouquetLegacy(encoded);
        } catch (e) {
            return this.decodeBouquetLegacy(encoded);
        }
    }

    private unpackProtocolV4(buffer: Uint8Array): { s: string, m: string, paths: DrawingPath[] } {
        let offset = 1;

        // Song
        const sLen = buffer[offset++];
        const shortS = new TextDecoder().decode(buffer.slice(offset, offset + sLen));
        const s = this.expandUrlContent(shortS);
        offset += sLen;

        // Message
        const mLen = (buffer[offset++] << 8) | buffer[offset++];
        const m = new TextDecoder().decode(buffer.slice(offset, offset + mLen));
        offset += mLen;

        // Paths
        const pathCount = buffer[offset++];
        const paths: DrawingPath[] = [];
        for (let i = 0; i < pathCount; i++) {
            const header = buffer[offset++];
            const colorIdx = (header >> 4) & 0x0f;
            const width = header & 0x0f;

            const pLen = (buffer[offset++] << 8) | buffer[offset++];
            const points: { x: number, y: number }[] = [];
            for (let j = 0; j < pLen; j++) {
                const qX = buffer[offset++];
                const qY = buffer[offset++];
                // De-quantize back to 800x800
                points.push({ x: (qX / 255) * 800, y: (qY / 255) * 800 });
            }
            paths.push({ color: this.palette[colorIdx] || this.palette[0], width, points });
        }

        return { s, m, paths };
    }

    private async unpackProtocolV3(buffer: Uint8Array): Promise<{ s: string; m: string; i?: string | null }> {
        let offset = 1;
        const sLen = buffer[offset++];
        const shortS = new TextDecoder().decode(buffer.slice(offset, offset + sLen));
        const s = this.expandUrlContent(shortS);
        offset += sLen;

        const mLen = (buffer[offset++] << 8) | buffer[offset++];
        const m = new TextDecoder().decode(buffer.slice(offset, offset + mLen));
        offset += mLen;

        const iBytes = buffer.slice(offset);
        let i: string | null = null;
        if (iBytes.length > 0) {
            const blob = new Blob([iBytes], { type: 'image/webp' });
            i = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }
        return { s, m, i };
    }

    private async unpackProtocolV2(buffer: Uint8Array): Promise<{ s: string; m: string; i?: string | null }> {
        return this.unpackProtocolV3(buffer);
    }

    private async unpackProtocolV1(buffer: Uint8Array): Promise<{ s: string; m: string; i?: string | null }> {
        let offset = 1;
        const sLen = (buffer[offset++] << 8) | buffer[offset++];
        const s = new TextDecoder().decode(buffer.slice(offset, offset + sLen));
        offset += sLen;

        const mLen = (buffer[offset++] << 8) | buffer[offset++];
        const m = new TextDecoder().decode(buffer.slice(offset, offset + mLen));
        offset += mLen;

        const iBytes = buffer.slice(offset);
        let i: string | null = null;
        if (iBytes.length > 0) {
            const blob = new Blob([iBytes], { type: 'image/webp' });
            i = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }
        return { s, m, i };
    }

    private shortenUrlContent(url: string): string {
        if (url.includes('open.spotify.com/track/')) {
            const id = url.split('/track/')[1]?.split('?')[0];
            return id ? `s:${id}` : url;
        }
        if (url.includes('youtube.com/watch?v=')) {
            const id = url.split('v=')[1]?.split('&')[0];
            return id ? `y:${id}` : url;
        }
        if (url.includes('youtu.be/')) {
            const id = url.split('youtu.be/')[1]?.split('?')[0];
            return id ? `y:${id}` : url;
        }
        return url;
    }

    private expandUrlContent(shortened: string): string {
        if (shortened.startsWith('s:')) return `https://open.spotify.com/track/${shortened.slice(2)}`;
        if (shortened.startsWith('y:')) return `https://www.youtube.com/watch?v=${shortened.slice(2)}`;
        return shortened;
    }

    private async decodeBouquetLegacy(encoded: string): Promise<{ s: string; m: string; i?: string | null } | null> {
        try {
            let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const binString = atob(base64);
            const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
            const jsonString = new TextDecoder().decode(bytes);
            return JSON.parse(jsonString);
        } catch (e) {
            return null;
        }
    }

    /**
     * Ramer-Douglas-Peucker simplification algorithm (V6).
     * Reduces the number of points in a curve while preserving its shape.
     */
    private simplifyPath(points: { x: number, y: number }[], epsilon: number): { x: number, y: number }[] {
        if (points.length <= 2) return points;

        let dmax = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const d = this.getPointLineDistance(points[i], points[0], points[end]);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        if (dmax > epsilon) {
            const recursiveResult1 = this.simplifyPath(points.slice(0, index + 1), epsilon);
            const recursiveResult2 = this.simplifyPath(points.slice(index), epsilon);
            return recursiveResult1.slice(0, recursiveResult1.length - 1).concat(recursiveResult2);
        } else {
            return [points[0], points[end]];
        }
    }

    private getPointLineDistance(p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx === 0 && dy === 0) {
            return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
        }
        return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.sqrt(Math.pow(dy, 2) + Math.pow(dx, 2));
    }

    // Commented out as requested - leaving it for V5 or future reference
    /*
    async compressImageToBytes(dataUrl: string, maxWidth: number = 150, quality: number = 0.2): Promise<Uint8Array | null> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
                        reader.readAsArrayBuffer(blob);
                    } else {
                        resolve(null);
                    }
                }, 'image/webp', quality);
            };
            img.src = dataUrl;
        });
    }
    */
}
