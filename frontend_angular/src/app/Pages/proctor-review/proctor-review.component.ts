import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProctoringService, CaptureListItem } from '../../core/services/ProctoringService/proctoring.service';

@Component({
  selector: 'app-proctor-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proctor-review.component.html',
  styleUrls: ['./proctor-review.component.css']
})
export class ProctorReviewComponent implements OnInit, OnDestroy {
  loading = false;
  lists: CaptureListItem[] = [];
  filterUser = '';
  filterQuiz = '';

  selectedPreviewBlob: Blob | null = null;
  previewUrl: string | null = null;
  previewFileName: string | null = null;

  constructor(private svc: ProctoringService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.cleanupPreview();
  }

  load() {
    this.loading = true;
    this.svc.listCaptures(this.filterUser || undefined, this.filterQuiz || undefined).subscribe({
      next: data => {
        this.lists = data || [];
        this.loading = false;
      },
      error: err => {
        console.error('Failed to list captures', err);
        this.loading = false;
      }
    });
  }

  refresh() {
    this.load();
  }

  preview(user: string, fileName: string) {
    this.svc.getFile(user, fileName).subscribe({
      next: blob => {
        this.cleanupPreview();
        this.selectedPreviewBlob = blob;
        this.previewFileName = fileName;
        this.previewUrl = URL.createObjectURL(blob);

        // show bootstrap modal if available
        try {
          const modalEl = document.getElementById('previewModal');
          // @ts-ignore - bootstrap is a global script when included
          const bm = (window as any).bootstrap?.Modal;
          if (bm && modalEl) {
            const inst = new bm(modalEl);
            inst.show();
          }
        } catch (e) {
          console.warn('Could not auto-show preview modal', e);
        }
      },
      error: err => {
        console.error('Failed to fetch file', err);
      }
    });
  }

  download(user: string, fileName: string) {
    // If fileName omitted or empty, do nothing
    if (!fileName) return;

    this.svc.getFile(user, fileName).subscribe({
      next: blob => {
        // create blob url and click anchor to trigger download (no external deps)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      error: err => {
        console.error('Download failed', err);
      }
    });
  }

  cleanupPreview() {
    if (this.previewUrl) {
      try {
        URL.revokeObjectURL(this.previewUrl);
      } catch (e) { /* ignore */ }
      this.previewUrl = null;
    }
    this.selectedPreviewBlob = null;
    this.previewFileName = null;
  }
}
