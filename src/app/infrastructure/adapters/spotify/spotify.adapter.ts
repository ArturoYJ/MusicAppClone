import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, map, switchMap, catchError, of, filter, tap, take } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MusicRepositoryPort } from '../../../core/domain/ports/music-repository.port';
import { Track, Album, Artist, SearchResult } from '../../../core/domain/models';

@Injectable({
  providedIn: 'root'
})
export class SpotifyAdapter implements MusicRepositoryPort {
  private tokenSubject = new BehaviorSubject<string>('');
  private token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    this.authenticate(); 
  }

  private authenticate(): void {
    const body = 'grant_type=client_credentials';
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${environment.spotify.clientId}:${environment.spotify.clientSecret}`)
    });

    console.log('Intentando autenticar...');

    this.http.post<any>(environment.spotify.authUrl, body, { headers })
      .pipe(
        tap(response => console.log('Autenticación exitosa, token recibido:', response.access_token)), // Log éxito
        catchError(err => { // <-- MEJOR MANEJO DE ERROR
          console.error('¡Error en la autenticación!', err);
          this.tokenSubject.next(''); // Asegura que el subject tenga un valor vacío en caso de error
          return of(null); // Retorna un observable nulo para que la cadena no se rompa
        })
      )
      .subscribe(response => {
        if (response) {
          this.tokenSubject.next(response.access_token);
        }
      });
  }

  private getHeaders(token: string): HttpHeaders {
    console.log('Usando token para la llamada API:', token);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private waitForToken(): Observable<string> {
    return this.token$.pipe(
      filter(token => token !== ''),
      take(1)
    );
  }

  searchTracks(query: string): Observable<Track[]> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track&limit=20`;
    return this.waitForToken().pipe(
      switchMap(token => this.http.get<any>(url, { headers: this.getHeaders(token) })),
      map(response => this.mapSpotifyTracksToTracks(response.tracks.items)),
      catchError(() => of([]))
    );
  }

  searchAll(query: string): Observable<SearchResult> {
    const url = `${environment.spotify.apiUrl}/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`;
    return this.waitForToken().pipe(
      switchMap(token => this.http.get<any>(url, { headers: this.getHeaders(token) })),
      map(response => ({
        tracks: this.mapSpotifyTracksToTracks(response.tracks?.items || []),
        albums: this.mapSpotifyAlbumsToAlbums(response.albums?.items || []),
        artists: this.mapSpotifyArtistsToArtists(response.artists?.items || [])
      })),
      catchError(() => of({ tracks: [], albums: [], artists: [] }))
    );
  }

  getAlbum(id: string): Observable<Album> {
    const url = `${environment.spotify.apiUrl}/albums/${id}`;
    return this.waitForToken().pipe(
      switchMap(token => this.http.get<any>(url, { headers: this.getHeaders(token) })),
      map(response => this.mapSpotifyAlbumToAlbum(response)),
      catchError(() => of({} as Album))
    );
  }

  getArtist(id: string): Observable<Artist> {
    const url = `${environment.spotify.apiUrl}/artists/${id}`;
    return this.waitForToken().pipe(
      switchMap(token => this.http.get<any>(url, { headers: this.getHeaders(token) })),
      map(response => this.mapSpotifyArtistToArtist(response)),
      catchError(() => of({} as Artist))
    );
  }

  getFeaturedPlaylists(): Observable<Album[]> {
    const url = `${environment.spotify.apiUrl}/browse/featured-playlists?limit=10`;
    return this.waitForToken().pipe(
      switchMap(token => this.http.get<any>(url, { headers: this.getHeaders(token) })),
      map(response => this.mapSpotifyPlaylistsToAlbums(response.playlists.items)),
      catchError(() => of([]))
    );
  }

  getNewReleases(): Observable<Album[]> {
    const url = `${environment.spotify.apiUrl}/browse/new-releases?limit=10`;
    return this.waitForToken().pipe(
      switchMap(token => this.http.get<any>(url, { headers: this.getHeaders(token) })),
      map(response => this.mapSpotifyAlbumsToAlbums(response.albums.items)),
      catchError(() => of([]))
    );
  }

  private mapSpotifyTracksToTracks(items: any[]): Track[] {
     return items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name || 'Unknown',
      album: item.album?.name || 'Unknown',
      albumCover: item.album?.images[0]?.url || '',
      duration: item.duration_ms,
      previewUrl: item.preview_url
    }));
  }

  private mapSpotifyAlbumsToAlbums(items: any[]): Album[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name || 'Unknown',
      coverImage: item.images[0]?.url || '',
      releaseDate: item.release_date,
      totalTracks: item.total_tracks
    }));
  }

   private mapSpotifyAlbumToAlbum(item: any): Album {
    // ... (sin cambios)
    return {
      id: item.id,
      name: item.name,
      artist: item.artists[0]?.name || 'Unknown',
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

   private mapSpotifyPlaylistsToAlbums(items: any[]): Album[] {
     return items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.owner?.display_name || 'Spotify',
      coverImage: item.images[0]?.url || '',
      releaseDate: '', 
      totalTracks: item.tracks?.total || 0
    }));
   }
}