import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track } from '../../domain/models'; // Ajusta la ruta si es necesario

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.scss'
})
export class PlayerBarComponent {
  @Input() selectedTrack: Track | null = null; // Recibe el track desde el padre

  /**
   * Formatea la duración de milisegundos a formato MM:SS
   */
  formatDuration(ms: number | undefined): string {
    if (!ms) return '0:00';

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    // Agregar 0 adelante si los segundos son menores a 10
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
}