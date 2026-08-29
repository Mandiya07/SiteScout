import { ImageMetadata, ImageSearchOptions } from "../types.js";

export interface ImageProvider {
  name: string;
  isAvailable(): boolean;
  search(query: string, options: ImageSearchOptions): Promise<ImageMetadata[]>;
}
