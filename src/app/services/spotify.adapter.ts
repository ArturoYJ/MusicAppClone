// src/app/services/spotify.adapter.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map, catchError, tap, delay, switchMap, from } from 'rxjs'; // Importa 'from'
import { environment } from '../../environments/environment';
import { MusicRepositoryPort } from '../domain/ports/music-repository.port';
import { Track, Album, Artist, SearchResult } from '../domain/models';
import { CookieService } from 'ngx-cookie-service'; // <-- 1. Importa el servicio

@Injectable({
  providedIn: 'root'
})
export class SpotifyAdapter implements MusicRepositoryPort {
  private token: string = '';
  private tokenExpiry: number = 0;
  private tokenPromise: Promise<string> | null = null;
  private tokenReady: boolean = false;
  
  // Constantes para los nombres de las cookies
  private readonly TOKEN_KEY = 'spotify_token';
  private readonly EXPIRY_KEY = 'spotify_token_expiry';
  
  constructor(
    private http: HttpClient,
    private cookieService: CookieService // <-- 2. Inyecta el servicio
  ) {
    console.log('SpotifyAdapter inicializado');
    this.initializeToken();
  }

  /**
   * Inicializa el token al cargar el servicio.
   * Primero revisa si hay un token válido en las cookies.
   */
  private initializeToken(): void {
    // 3. Revisa si hay un token válido en las cookies
    const cookieToken = this.cookieService.get(this.TOKEN_KEY);
    const cookieExpiry = +this.cookieService.get(this.EXPIRY_KEY) || 0; // El '+' convierte el string a número

    if (cookieToken && cookieExpiry > Date.now()) {
      // Si tenemos un token válido en cookies
      console.log('Token válido encontrado en cookies');
      this.token = cookieToken;
      this.tokenExpiry = cookieExpiry;
      this.tokenReady = true;
      this.tokenPromise = Promise.resolve(this.token);
    } else {
      // Si no hay token o está expirado, pedimos uno nuevo
      console.log('No hay token válido en cookies, solicitando uno nuevo...');
      this.tokenPromise = this.authenticate();
    }
  }

  /**
   * Obtiene el token de autenticación de Spotify y lo guarda en cookies
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
            this.tokenReady = true; 
            
            // 4. Guardar el token y la expiración en las cookies
            const expiryDate = new Date(this.tokenExpiry);
            this.cookieService.set(this.TOKEN_KEY, this.token, expiryDate);
            this.cookieService.set(this.EXPIRY_KEY, this.tokenExpiry.toString(), expiryDate);
            
            console.log('✓ Token obtenido y guardado en cookies');
            console.log('Token:', this.token.substring(0, 20) + '...');
            console.log('Expira en:', response.expires_in, 'segundos');
            resolve(this.token);
          },
          error: (err) => {
            console.error('✗ Error al obtener token:', err);
            // Limpiar cookies si falla la autenticación
            this.cookieService.delete(this.TOKEN_KEY);
            this.cookieService.delete(this.EXPIRY_KEY);
            reject(err);
          }
        });
    });
  }

  /**
   * Verifica si el token actual sigue siendo válido
   */
  private isTokenValid(): boolean {
    // Esta función ya no necesita leer cookies,
    // porque `this.token` y `this.tokenExpiry` se cargan
    // desde las cookies en `initializeToken`.
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
    // Esta lógica no cambia, ya funciona perfectamente
    if (this.isTokenValid()) {
      return this.token;
    }
    
    // Si el tokenPromise ya está pidiendo un token, espera a que termine
    if (this.tokenPromise && !this.tokenReady) {
      console.log('Esperando petición de token existente...');
      return this.tokenPromise;
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
   */
  public waitForToken(): Promise<void> {
    if (this.tokenReady) {
      return Promise.resolve();
    }
    // Si tokenPromise es null (porque falló al inicio), reintenta
    if (!this.tokenPromise) { 
      this.tokenPromise = this.authenticate();
    }
    return this.tokenPromise!.then(() => {});
  }

  /**
   * Busca canciones por texto
   */
  searchTracks(query: string): Observable<Track[]> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track&limit=20`;
    console.log('Buscando tracks en Spotify API:', query);

    // Convertir la promesa getHeaders() en un Observable
    return from(this.getHeaders()).pipe(
      // switchMap espera a getHeaders() y luego llama a http.get()
      switchMap(headers => {
        return this.http.get<any>(url, { headers }).pipe(
          map(response => {
            const tracks = this.mapSpotifyTracksToTracks(response.tracks.items);
            console.log(`Encontrados ${tracks.length} tracks`);
            return tracks;
          })
        );
      }),
      // catchError maneja errores de getHeaders() O de http.get()
      catchError(error => {
        console.error('Error buscando tracks:', error);
        return of([]); // Devuelve un array vacío en caso de error
      })
    );
  }

  /**
   * Búsqueda completa que incluye: tracks, albums y artists
   */
  searchAll(query: string): Observable<SearchResult> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`;

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.get<any>(url, { headers }).pipe(
          map(response => ({
            tracks: this.mapSpotifyTracksToTracks(response.tracks?.items || []),
            albums: this.mapSpotifyAlbumsToAlbums(response.albums?.items || []),
            artists: this.mapSpotifyArtistsToArtists(response.artists?.items || [])
          }))
        );
      }),
      catchError(error => {
        console.error('Error en searchAll:', error);
        return of({ tracks: [], albums: [], artists: [] });
      })
    );
  }

  getAlbum(id: string): Observable<Album> {
    const url = `${environment.spotify.apiUrl}/albums/${id}`;

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.get<any>(url, { headers }).pipe(
          map(response => this.mapSpotifyAlbumToAlbum(response))
        );
      }),
      catchError(error => {
        console.error('Error obteniendo album:', error);
        return of({} as Album); // Devuelve un objeto vacío en caso de error
      })
    );
  }

  getArtist(id: string): Observable<Artist> {
    const url = `${environment.spotify.apiUrl}/artists/${id}`;

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.get<any>(url, { headers }).pipe(
          map(response => this.mapSpotifyArtistToArtist(response))
        );
      }),
      catchError(error => {
        console.error('Error obteniendo artista:', error);
        return of({} as Artist);
      })
    );
  }

  /**
   * Obtiene los nuevos lanzamientos de música
   */
  getNewReleases(): Observable<Album[]> {
    const url = `${environment.spotify.apiUrl}/browse/new-releases?limit=50`;
    console.log('Obteniendo nuevos lanzamientos...');

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        console.log('Headers listos para new releases...');
        return this.http.get<any>(url, { headers }).pipe(
          map(response => {
            const releases = this.mapSpotifyAlbumsToAlbums(response.albums.items);
            console.log(`${releases.length} nuevos lanzamientos obtenidos`);
            return releases;
          })
        );
      }),
      catchError(error => {
        console.error('Error obteniendo nuevos lanzamientos:', error);
        return of([]);
      })
    );
  }

  // ============================================
  // Métodos privados para mapear datos 
  // ============================================
  
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

  private mapSpotifyArtistsToArtists(items: any[]): Artist[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      image: item.images[0]?.url || '',
      genres: item.genres || [],
      followers: item.followers?.total
    }));
  }

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