import { Track } from './track.model';   
import { Album } from './album.model';
import { Artist } from './artist.model';

export interface SearchResult {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}
