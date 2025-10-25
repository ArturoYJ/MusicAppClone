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

  searchQuery = ''; // Query de búsqueda
  searchResults: SearchResult | null = null;
  featuredPlaylists: Album[] = [];
  newReleases: Album[] = [];
  selectedTrack: Track | null = null;
  isSearching = false;

  constructor(private musicService: MusicService) {
    console.log('HomeComponent inicializado'); 
  }

  ngOnInit() {
    this.loadInitialData();
  }

  /**
   * Carga los datos iniciales: playlists y nuevos lanzamientos
   */
  loadInitialData() {
    console.log('Cargando datos iniciales...');
    
    // Cargar playlists destacadas
    this.musicService.getFeaturedPlaylists().subscribe({
      next: (data) => {
        this.featuredPlaylists = data;
        console.log('Playlists cargadas:', data.length);
      },
      error: (err) => {
        console.error('Error cargando playlists:', err);
      }
    });
    
    // Cargar nuevos lanzamientos
    this.musicService.getNewReleases().subscribe({
      next: (data) => {
        this.newReleases = data;
        console.log('Nuevos lanzamientos cargados:', data.length);
      },
      error: (err) => {
        console.error('Error cargando lanzamientos:', err);
      }
    });
  }

  /**
   * Maneja la búsqueda cuando el usuario presiona Enter
   */
  onSearch() {
    // Validar que no esté vacío
    if (!this.searchQuery.trim()) {
      console.log('Búsqueda vacía');
      return;
    }
    
    console.log('Buscando:', this.searchQuery);
    this.isSearching = true;
    this.searchResults = null;
    
    this.musicService.searchAll(this.searchQuery).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
        console.log('Búsqueda completada:', results);
      },
      error: (err) => {
        console.error('Error en la búsqueda:', err);
        this.isSearching = false;
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  /**
   * Limpia la búsqueda y vuelve a la vista principal
   */
  clearSearch() {
    console.log('Limpiando búsqueda');
    this.searchQuery = '';
    this.searchResults = null;
  }

  /**
   * Selecciona una canción para "reproducir"
   * NOTA: Por ahora solo la selecciona, falta implementar reproducción real
   */
  selectTrack(track: Track) {
    this.selectedTrack = track;
    console.log('Track seleccionado:', track.name, 'por', track.artist);
    // TODO: Implementar reproducción real con el preview_url
  }

  /**
   * Formatea la duración de milisegundos a formato MM:SS
   */
  formatDuration(ms: number): string {
    if (!ms) return '0:00';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    // Agregar 0 adelante si los segundos son menores a 10
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
}