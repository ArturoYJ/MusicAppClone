import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { MusicRepositoryPort } from '../domain/ports/music-repository.port';
import { Track, Album, Artist, SearchResult } from '../domain/models';
import { SpotifyAdapter } from './spotify.adapter';

@Injectable({
  providedIn: 'root'
})
export class MusicService {
  // Cache simple para no hacer tantas peticiones a la API
  private cache = new Map<string, any>();
  
  constructor(private musicRepository: MusicRepositoryPort) {
    console.log('MusicService inicializado');
  }

  /**
   * Espera a que el adaptador de Spotify esté listo
   * NOTA: Necesario para evitar errores 400 al inicio
   */
  async waitForSpotify(): Promise<void> {
    if (this.musicRepository instanceof SpotifyAdapter) {
      await this.musicRepository.waitForToken();
      console.log('✓ Spotify listo para usar');
    }
  }

  /**
   * Busca canciones y las cachea para mejorar performance
   * TODO: Agregar tiempo de expiración al cache
   */
  searchTracks(query: string): Observable<Track[]> {
    console.log('Buscando tracks:', query);
    
    // Revisar si ya tenemos el resultado en cache
    const cacheKey = `tracks_${query}`;
    if (this.cache.has(cacheKey)) {
      console.log('Usando resultado del cache');
      return of(this.cache.get(cacheKey));
    }
    
    return this.musicRepository.searchTracks(query).pipe(
      tap(tracks => {
        // Guardar en cache
        this.cache.set(cacheKey, tracks);
        console.log(`${tracks.length} tracks encontrados`);
      })
    );
  }

  /**
   * Búsqueda completa: tracks, albums y artists
   */
  searchAll(query: string): Observable<SearchResult> {
    // Validar que el query no esté vacío
    if (!query || query.trim().length === 0) {
      console.log('Query vacío, retornando resultados vacíos');
      return of({ tracks: [], albums: [], artists: [] });
    }
    
    return this.musicRepository.searchAll(query).pipe(
      tap(results => {
        console.log('Resultados de búsqueda:', {
          tracks: results.tracks.length,
          albums: results.albums.length,
          artists: results.artists.length
        });
      })
    );
  }

  getAlbum(id: string): Observable<Album> {
    return this.musicRepository.getAlbum(id);
  }

  getArtist(id: string): Observable<Artist> {
    return this.musicRepository.getArtist(id);
  }

  /**
   * Nuevos lanzamientos de música
   */
  getNewReleases(): Observable<Album[]> {
    return this.musicRepository.getNewReleases().pipe(
      tap(releases => console.log('Nuevos lanzamientos:', releases.length))
    );
  }
  
  /**
   * Limpia el cache (útil para refrescar datos)
   * NOTA: Llamar esto si los datos se ven desactualizados
   */
  clearCache(): void {
    console.log('Cache limpiado');
    this.cache.clear();
  }
}