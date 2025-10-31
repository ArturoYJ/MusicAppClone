// src/app/app.config.ts

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { MusicRepositoryPort } from './domain/ports/music-repository.port';
import { SpotifyAdapter } from './services/spotify.adapter';
import { CookieService } from 'ngx-cookie-service'; // <-- Importa el servicio de cookies

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: MusicRepositoryPort, useClass: SpotifyAdapter },
    CookieService // <-- Añádelo aquí
  ]
};