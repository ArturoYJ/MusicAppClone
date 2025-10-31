// src/app/pipes/format-duration.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDuration',
  standalone: true // Hacemos el Pipe standalone
})
export class FormatDurationPipe implements PipeTransform {

  transform(ms: number | undefined | null): string {
    if (!ms) return '0:00';

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    // Agregar 0 adelante si los segundos son menores a 10
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
}