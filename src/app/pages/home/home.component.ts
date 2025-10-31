// src/app/pages/home/home.component.ts

import { Component, OnInit, Inject } from '@angular/core'; // <-- Añade Inject
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Track, Album, Artist, SearchResult } from '../../domain/models';
import { MusicRepositoryPort } from '../../domain/ports/music-repository.port'; // <-- Importa el Puerto
import { SpotifyAdapter } from '../../services/spotify.adapter'; // <-- Importa el Adaptador

// Importa los componentes
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { SearchBarComponent } from '../../components/search-bar/search-bar';
import { PlayerBarComponent } from '../../components/player-bar/player-bar';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, SearchBarComponent, PlayerBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  searchResults: SearchResult | null = null;
  newReleases: Album[] = [];
  selectedTrack: Track | null = null;
  isSearching = false;
  isLoading = true;

  // Inyecta el MusicRepositoryPort directamente
  constructor(
    @Inject(MusicRepositoryPort) private musicRepository: MusicRepositoryPort
  ) {
    console.log('HomeComponent inicializado');
  }

  ngOnInit() {
    console.log('Esperando que Spotify esté listo...');
    
    // Comprueba si el repositorio es el adaptador de Spotify para llamar a waitForToken
    // Esto es necesario para que el componente espere al token
    if (this.musicRepository instanceof SpotifyAdapter) {
      this.musicRepository.waitForToken()
        .then(() => {
          console.log('Token listo, cargando datos...');
          this.loadInitialData();
        })
        .catch(err => {
          console.error('Error esperando token:', err);
          this.isLoading = false;
        });
    } else {
      // Si no es Spotify (quizás para pruebas), carga datos directamente
      this.loadInitialData();
    }
  }

  loadInitialData() {
    console.log('Cargando datos iniciales...');
    this.isLoading = true; // Asegúrate de mostrar el loader
    this.musicRepository.getNewReleases().subscribe({
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

    // Usa el repositorio directamente
    this.musicRepository.searchAll(query).subscribe({
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
  }

  /**
   * Selecciona una canción para "reproducir"
   */
  selectTrack(track: Track) {
    this.selectedTrack = track;
    console.log('Track seleccionado:', track.name, 'por', track.artist);
  }
}