import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map, catchError, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MusicRepositoryPort } from '../../../core/domain/ports/music-repository.port';
import { Track, Album, Artist, SearchResult } from '../../../core/domain/models';

@Injectable({
  providedIn: 'root'
})
export class SpotifyAdapter implements MusicRepositoryPort {
  private token: string = '';
  private tokenExpiry: number = 0; // Timestamp de cuando expira el token
  
  constructor(private http: HttpClient) {
    console.log('SpotifyAdapter inicializado');
    this.authenticate();
  }

  /**
   * Obtiene el token de autenticación de Spotify usando Client Credentials Flow
   * Documentación: https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
   */
  private authenticate(): void {
    const body = 'grant_type=client_credentials';
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(
        `${environment.spotify.clientId}:${environment.spotify.clientSecret}`
      )
    });

    console.log('Solicitando token a Spotify...');

    this.http.post<any>(environment.spotify.authUrl, body, { headers })
      .subscribe({
        next: (response) => {
          this.token = response.access_token;
          // El token expira en 3600 segundos (1 hora)
          this.tokenExpiry = Date.now() + (response.expires_in * 1000);
          console.log('✓ Token obtenido correctamente');
          console.log('Expira en:', response.expires_in, 'segundos');
        },
        error: (err) => {
          console.error('✗ Error al obtener token:', err);
          // TODO: Implementar retry automático aquí
        }
      });
  }

  /**
   * Verifica si el token actual sigue siendo válido
   */
  private isTokenValid(): boolean {
    const isValid = this.token !== '' && Date.now() < this.tokenExpiry;
    if (!isValid) {
      console.log('Token expirado o no existe');
    }
    return isValid;
  }

  /**
   * Genera los headers necesarios para las peticiones a la API de Spotify
   */
  private getHeaders(): HttpHeaders {
    // Verificar si el token expiró
    if (!this.isTokenValid()) {
      console.warn('Token expirado, obteniendo uno nuevo...');
      this.authenticate();
      // FIXME: Esto puede causar problemas si la petición se hace antes de obtener el nuevo token
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    });
  }

  /**
   * Busca canciones por texto
   */
  searchTracks(query: string): Observable<Track[]> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track&limit=20`;
    
    console.log('Buscando tracks en Spotify API:', query);
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        map(response => {
          const tracks = this.mapSpotifyTracksToTracks(response.tracks.items);
          console.log(`Encontrados ${tracks.length} tracks`);
          return tracks;
        }),
        catchError(error => {
          console.error('Error buscando tracks:', error);
          return of([]); // Retornar array vacío en caso de error
        })
      );
  }

  /**
   * Búsqueda completa que incluye: tracks, albums y artists
   */
  searchAll(query: string): Observable<SearchResult> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        map(response => ({
          tracks: this.mapSpotifyTracksToTracks(response.tracks?.items || []),
          albums: this.mapSpotifyAlbumsToAlbums(response.albums?.items || []),
          artists: this.mapSpotifyArtistsToArtists(response.artists?.items || [])
        })),
        catchError(error => {
          console.error('Error en searchAll:', error);
          return of({ tracks: [], albums: [], artists: [] });
        })
      );
  }

  getAlbum(id: string): Observable<Album> {
    const url = `${environment.spotify.apiUrl}/albums/${id}`;
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        map(response => this.mapSpotifyAlbumToAlbum(response)),
        catchError(error => {
          console.error('Error obteniendo album:', error);
          return of({} as Album);
        })
      );
  }

  getArtist(id: string): Observable<Artist> {
    const url = `${environment.spotify.apiUrl}/artists/${id}`;
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        map(response => this.mapSpotifyArtistToArtist(response)),
        catchError(error => {
          console.error('Error obteniendo artista:', error);
          return of({} as Artist);
        })
      );
  }

  /**
   * Obtiene las playlists destacadas de Spotify
   */
  getFeaturedPlaylists(): Observable<Album[]> {
    const url = `${environment.spotify.apiUrl}/browse/featured-playlists?limit=10`;
    console.log('Obteniendo playlists destacadas...');
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        map(response => {
          const playlists = this.mapSpotifyPlaylistsToAlbums(response.playlists.items);
          console.log(`${playlists.length} playlists obtenidas`);
          return playlists;
        }),
        catchError(error => {
          console.error('Error obteniendo playlists:', error);
          return of([]);
        })
      );
  }

  /**
   * Obtiene los nuevos lanzamientos de música
   */
  getNewReleases(): Observable<Album[]> {
    const url = `${environment.spotify.apiUrl}/browse/new-releases?limit=10`;
    console.log('Obteniendo nuevos lanzamientos...');
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        map(response => {
          const releases = this.mapSpotifyAlbumsToAlbums(response.albums.items);
          console.log(`${releases.length} nuevos lanzamientos obtenidos`);
          return releases;
        }),
        catchError(error => {
          console.error('Error obteniendo nuevos lanzamientos:', error);
          return of([]);
        })
      );
  }

  // ============================================
  // Métodos privados para mapear datos de Spotify a nuestros modelos
  // ============================================
  
  /**
   * Convierte los tracks de Spotify al formato de nuestro modelo Track
   */
  private mapSpotifyTracksToTracks(items: any[]): Track[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name || 'Desconocido',
      album: item.album?.name || 'Desconocido',
      albumCover: item.album?.images[0]?.url || '',
      duration: item.duration_ms,
      previewUrl: item.preview_url
    }));
  }

  /**
   * Convierte albums de Spotify a nuestro modelo Album
   */
  private mapSpotifyAlbumsToAlbums(items: any[]): Album[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name || 'Desconocido',
      coverImage: item.images[0]?.url || '',
      releaseDate: item.release_date,
      totalTracks: item.total_tracks
    }));
  }

  /**
   * Convierte un album individual con sus tracks
   */
  private mapSpotifyAlbumToAlbum(item: any): Album {
    return {
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name || 'Desconocido',
      coverImage: item.images[0]?.url || '',
      releaseDate: item.release_date,
      totalTracks: item.total_tracks,
      tracks: this.mapSpotifyTracksToTracks(item.tracks?.items || [])
    };
  }

  /**
   * Convierte artistas de Spotify a nuestro modelo
   */
  private mapSpotifyArtistsToArtists(items: any[]): Artist[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      image: item.images[0]?.url || '',
      genres: item.genres || [],
      followers: item.followers?.total
    }));
  }

  /**
   * Convierte un artista individual
   */
  private mapSpotifyArtistToArtist(item: any): Artist {
    return {
      id: item.id,
      name: item.name,
      image: item.images[0]?.url || '',
      genres: item.genres || [],
      followers: item.followers?.total
    };
  }

  /**
   * Convierte playlists de Spotify a formato Album
   * NOTA: Reutilizo el modelo Album para las playlists para no crear otro componente
   */
  private mapSpotifyPlaylistsToAlbums(items: any[]): Album[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.owner?.display_name || 'Spotify',
      coverImage: item.images[0]?.url || '',
      releaseDate: '', // Las playlists no tienen fecha de lanzamiento
      totalTracks: item.tracks?.total || 0
    }));
  }
}