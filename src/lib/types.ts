export type Place = {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

export type Pint = {
  id: string;
  user_id: string;
  place_id: string;
  beer_name: string;
  brewery: string | null;
  style: string | null;
  rating: number;
  notes: string | null;
  photo_path: string | null;
  is_guinness: boolean;
  pour_score: number | null;
  head_score: number | null;
  temp_score: number | null;
  creamy_score: number | null;
  drank_at: string;
  created_at: string;
};

export const PLACE_KINDS = ['pub', 'bar', 'brewery', 'restaurant', 'home', 'other'] as const;
