/**
 * Shared media types. Pure - safe to import from tests.
 */

/** A photo that has been copied into app cache and had EXIF rotation applied. */
export type Photo = {
  id: string;
  /** Local `file://` uri inside the app cache directory. */
  uri: string;
  /** True pixel width after normalization. */
  width: number;
  /** True pixel height after normalization. */
  height: number;
  name?: string;
};

/** Normalized rectangle in source-image fractions (0..1). */
export type Crop = { x: number; y: number; w: number; h: number };

/** Pixel crop rectangle used by expo-image-manipulator. */
export type RectPx = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};
