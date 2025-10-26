import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  
import { MusicService } from '../../services/music.service'; 
import { Track, Album, Artist, SearchResult } from '../../domain/models'; 

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
  newReleases: Album[] = [];
  selectedTrack: Track | null = null;
  isSearching = false;
  isLoading = true; // Indicador de carga inicial

  constructor(private musicService: MusicService) {
    console.log('HomeComponent inicializado'); 
  }

  ngOnInit() {
    console.log('Esperando que Spotify esté listo...');
    
    // Usar waitForSpotify con then/catch en lugar de async/await
    this.musicService.waitForSpotify()
      .then(() => {
        console.log('Token listo, cargando datos...');
        this.loadInitialData();
      })
      .catch(err => {
        console.error('Error esperando token:', err);
        this.isLoading = false;
      });
  }

  /**
   * Carga los datos iniciales: playlists y nuevos lanzamientos
   */
    loadInitialData() {
        console.log('Cargando datos iniciales...');
        
        // Cargar nuevos lanzamientos
        this.musicService.getNewReleases().subscribe({
          next: (data) => {
            this.newReleases = data;
            this.isLoading = false; // Marcar como cargado cuando lleguen los lanzamientos
            console.log('Nuevos lanzamientos cargados:', data.length);
          },
          error: (err) => {
            console.error('Error cargando lanzamientos:', err);
            this.isLoading = false;
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