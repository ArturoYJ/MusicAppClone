import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map, catchError, tap, delay, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MusicRepositoryPort } from '../domain/ports/music-repository.port';
import { Track, Album, Artist, SearchResult } from '../domain/models';

@Injectable({
  providedIn: 'root'
})
export class SpotifyAdapter implements MusicRepositoryPort {
  private token: string = '';
  private tokenExpiry: number = 0;
  private tokenPromise: Promise<string> | null = null;
  private tokenReady: boolean = false; // Indica si el token ya está disponible
  
  constructor(private http: HttpClient) {
    console.log('SpotifyAdapter inicializado');
    this.initializeToken();
  }

  /**
   * Inicializa el token al cargar el servicio
   */
  private initializeToken(): void {
    this.tokenPromise = this.authenticate();
  }

  /**
   * Obtiene el token de autenticación de Spotify usando Client Credentials Flow
   * Documentación: https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
   */
  private authenticate(): Promise<string> {
    const body = 'grant_type=client_credentials';
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(
        `${environment.spotify.clientId}:${environment.spotify.clientSecret}`
      )
    });

    console.log('Solicitando token a Spotify...');

    return new Promise((resolve, reject) => {
      this.http.post<any>(environment.spotify.authUrl, body, { headers })
        .subscribe({
          next: (response) => {
            this.token = response.access_token;
            // El token expira en 3600 segundos (1 hora)
            this.tokenExpiry = Date.now() + (response.expires_in * 1000);
            this.tokenReady = true; // Marcar token como listo
            console.log('✓ Token obtenido correctamente');
            console.log('Token:', this.token.substring(0, 20) + '...');
            console.log('Expira en:', response.expires_in, 'segundos');
            resolve(this.token);
          },
          error: (err) => {
            console.error('✗ Error al obtener token:', err);
            reject(err);
          }
        });
    });
  }

  /**
   * Verifica si el token actual sigue siendo válido
   */
  private isTokenValid(): boolean {
    const isValid = this.token !== '' && Date.now() < this.tokenExpiry;
    if (!isValid) {
      console.log('Token expirado o no existe, renovando...');
    }
    return isValid;
  }

  /**
   * Obtiene un token válido (espera si es necesario)
   */
  private async getValidToken(): Promise<string> {
    // Si el token es válido, retornarlo
    if (this.isTokenValid()) {
      return this.token;
    }

    // Si no hay token o expiró, obtener uno nuevo
    console.log('Obteniendo nuevo token...');
    this.tokenPromise = this.authenticate();
    return this.tokenPromise;
  }

  /**
   * Genera los headers necesarios para las peticiones a la API de Spotify
   */
  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.getValidToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Retorna una promesa que se resuelve cuando el token está listo
   * Este método es público para que otros servicios puedan esperar
   */
  public waitForToken(): Promise<void> {
    if (this.tokenReady) {
      return Promise.resolve();
    }
    return this.tokenPromise!.then(() => {});
  }

  /**
   * Busca canciones por texto
   */
  searchTracks(query: string): Observable<Track[]> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track&limit=20`;
    
    console.log('Buscando tracks en Spotify API:', query);
    
    // Convertir la promesa en Observable
    return new Observable(observer => {
      this.getHeaders().then(headers => {
        this.http.get<any>(url, { headers })
          .pipe(
            map(response => {
              const tracks = this.mapSpotifyTracksToTracks(response.tracks.items);
              console.log(`Encontrados ${tracks.length} tracks`);
              return tracks;
            }),
            catchError(error => {
              console.error('Error buscando tracks:', error);
              return of([]);
            })
          )
          .subscribe({
            next: (tracks) => {
              observer.next(tracks);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
      }).catch(err => {
        console.error('Error obteniendo headers:', err);
        observer.next([]);
        observer.complete();
      });
    });
  }

  /**
   * Búsqueda completa que incluye: tracks, albums y artists
   */
  
  searchAll(query: string): Observable<SearchResult> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`;
    
    return new Observable(observer => {
      this.getHeaders().then(headers => {
        this.http.get<any>(url, { headers })
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
          )
          .subscribe({
            next: (results) => {
              observer.next(results);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
      }).catch(err => {
        console.error('Error obteniendo headers:', err);
        observer.next({ tracks: [], albums: [], artists: [] });
        observer.complete();
      });
    });
  }

  getAlbum(id: string): Observable<Album> {
    const url = `${environment.spotify.apiUrl}/albums/${id}`;
    
    return new Observable(observer => {
      this.getHeaders().then(headers => {
        this.http.get<any>(url, { headers })
          .pipe(
            map(response => this.mapSpotifyAlbumToAlbum(response)),
            catchError(error => {
              console.error('Error obteniendo album:', error);
              return of({} as Album);
            })
          )
          .subscribe({
            next: (album) => {
              observer.next(album);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
      });
    });
  }

  getArtist(id: string): Observable<Artist> {
    const url = `${environment.spotify.apiUrl}/artists/${id}`;
    
    return new Observable(observer => {
      this.getHeaders().then(headers => {
        this.http.get<any>(url, { headers })
          .pipe(
            map(response => this.mapSpotifyArtistToArtist(response)),
            catchError(error => {
              console.error('Error obteniendo artista:', error);
              return of({} as Artist);
            })
          )
          .subscribe({
            next: (artist) => {
              observer.next(artist);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
      });
    });
  }

  /**
   * Obtiene los nuevos lanzamientos de música
   */

  getNewReleases(): Observable<Album[]> {
    const url = `${environment.spotify.apiUrl}/browse/new-releases?limit=10`;
    console.log('Obteniendo nuevos lanzamientos...');
    
    return new Observable(observer => {
      this.getHeaders().then(headers => {
        console.log('Headers listos para new releases...');
        this.http.get<any>(url, { headers })
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
          )
          .subscribe({
            next: (releases) => {
              observer.next(releases);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
      }).catch(err => {
        console.error('Error obteniendo headers para new releases:', err);
        observer.next([]);
        observer.complete();
      });
    });
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
}