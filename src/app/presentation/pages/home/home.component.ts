import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  
import { MusicService } from '../../../core/application/music.service'; 
import { Track, Album, Artist, SearchResult } from '../../../core/domain/models'; 

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  
  templateUrl: './home.component.html', 
  styleUrl: './home.component.scss'   
})
export class HomeComponent implements OnInit {

  searchQuery: string = '';
  searchResults: SearchResult | null = null;
  featuredPlaylists: Album[] = [];
  newReleases: Album[] = [];
  selectedTrack: Track | null = null;
  isSearching: boolean = false;

  constructor(private musicService: MusicService) {
    console.log('HomeComponent cargado'); 
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.musicService.getFeaturedPlaylists().subscribe(data => this.featuredPlaylists = data);
    this.musicService.getNewReleases().subscribe(data => this.newReleases = data);
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;
    this.searchResults = null;
    this.musicService.searchAll(this.searchQuery).subscribe(results => {
      this.searchResults = results;
      this.isSearching = false;
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = null;
  }

  selectTrack(track: Track): void {
    this.selectedTrack = track;
    console.log('Track seleccionado:', track);
  }

  formatDuration(ms: number): string {
    if (!ms) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ':' + (parseInt(seconds) < 10 ? '0' : '') + seconds;
  }
}