export interface Element {
  id: string;
  name: string;
  color: string; // Color tag for categorization
  photos: ElementPhoto[];
  created_at: string;
  updated_at: string;
}

export interface ElementPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  added_at: string;
}

export type ColorTag =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray';
