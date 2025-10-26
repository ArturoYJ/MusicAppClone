import { Track } from './track.model';

export interface Album {
  id: string;
  name: string;
  artist: string;
  coverImage: string;
  releaseDate: string;
  totalTracks: number;
  tracks?: Track[];
}