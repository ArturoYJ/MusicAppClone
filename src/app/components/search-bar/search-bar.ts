import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss'
})
export class SearchBarComponent {
  searchQuery = '';

  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  onSearchEnter() {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery);
    }
  }

  onClearSearch() {
    this.searchQuery = '';
    this.clear.emit();
  }
}