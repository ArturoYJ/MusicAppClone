import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MusicRepositoryPort } from '../domain/ports/music-repository.port';
import { Track, Album, Artist, SearchResult } from '../domain/models';

@Injectable({
  providedIn: 'root'
})
export class MusicService {
  constructor(private musicRepository: MusicRepositoryPort) {}

  searchTracks(query: string): Observable<Track[]> {
    return this.musicRepository.searchTracks(query);
  }

  searchAll(query: string): Observable<SearchResult> {
    return this.musicRepository.searchAll(query);
  }

  getAlbum(id: string): Observable<Album> {
    return this.musicRepository.getAlbum(id);
  }

  getArtist(id: string): Observable<Artist> {
    return this.musicRepository.getArtist(id);
  }

  getFeaturedPlaylists(): Observable<Album[]> {
    return this.musicRepository.getFeaturedPlaylists();
  }

  getNewReleases(): Observable<Album[]> {
    return this.musicRepository.getNewReleases();
  }
}