// src/app/components/player-bar/player-bar.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track } from '../../domain/models';
import { FormatDurationPipe } from '../../pipes/format-duration.pipe'; // <-- Importa el Pipe

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule, FormatDurationPipe], // <-- Añade el Pipe a los imports
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.scss'
})
export class PlayerBarComponent {
  @Input() selectedTrack: Track | null = null; // Recibe el track desde el padre

}