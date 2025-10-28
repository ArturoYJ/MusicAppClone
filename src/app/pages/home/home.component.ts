import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MusicService } from '../../services/music.service';
import { Track, Album, Artist, SearchResult } from '../../domain/models';

// Importa los nuevos componentes
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SearchBarComponent } from '../../components/search-bar/search-bar';
import { PlayerBarComponent } from '../../components/player-bar/player-bar';


@Component({
  selector: 'app-home',
  standalone: true,
  // Añade los nuevos componentes a imports
  imports: [CommonModule, FormsModule, SidebarComponent, SearchBarComponent, PlayerBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  // searchQuery ya no está aquí
  searchResults: SearchResult | null = null;
  newReleases: Album[] = [];
  selectedTrack: Track | null = null;
  isSearching = false;
  isLoading = true;

  constructor(private musicService: MusicService) {
    console.log('HomeComponent inicializado');
  }

  ngOnInit() {
    console.log('Esperando que Spotify esté listo...');
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

  loadInitialData() {
    console.log('Cargando datos iniciales...');
    this.musicService.getNewReleases().subscribe({
      next: (data) => {
        this.newReleases = data;
        this.isLoading = false;
        console.log('Nuevos lanzamientos cargados:', data.length);
      },
      error: (err) => {
        console.error('Error cargando lanzamientos:', err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Maneja el evento 'search' emitido por SearchBarComponent
   */
  handleSearch(query: string) {
    if (!query.trim()) {
      console.log('Búsqueda vacía');
      return;
    }

    console.log('Buscando desde HomeComponent:', query);
    this.isSearching = true;
    this.searchResults = null; // Limpia resultados anteriores

    this.musicService.searchAll(query).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
        console.log('Búsqueda completada:', results);
      },
      error: (err) => {
        console.error('Error en la búsqueda:', err);
        this.isSearching = false;
      }
    });
  }

  /**
   * Maneja el evento 'clear' emitido por SearchBarComponent
   */
  handleClearSearch() {
    console.log('Limpiando búsqueda desde HomeComponent');
    this.searchResults = null;
    // No necesitas limpiar searchQuery aquí porque está en SearchBarComponent
  }

  /**
   * Selecciona una canción para "reproducir"
   */
  selectTrack(track: Track) {
    this.selectedTrack = track;
    console.log('Track seleccionado:', track.name, 'por', track.artist);
  }

  // formatDuration ya no está aquí, se movió a PlayerBarComponent
}