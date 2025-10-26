import { Observable } from 'rxjs';
import { Track, Album, Artist, SearchResult } from '../models';

export abstract class MusicRepositoryPort {
  abstract searchTracks(query: string): Observable<Track[]>;
  abstract searchAll(query: string): Observable<SearchResult>;
  abstract getAlbum(id: string): Observable<Album>;
  abstract getArtist(id: string): Observable<Artist>;
  abstract getNewReleases(): Observable<Album[]>;
}
