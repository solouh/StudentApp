/**
 * Photo picking, normalization, cropping, base64 and saving.
 *
 * Design notes:
 * - every picked photo is normalized once (EXIF orientation baked in, long edge
 *   capped) so crop math uses authoritative pixel dimensions;
 * - crops run sequentially, never in parallel, to keep peak memory low on
 *   low-end Android phones;
 * - all intermediate files live in the app cache; the OS reclaims them.
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import type { RefObject } from 'react';
import { Platform, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ToolError, toToolError } from '../errors';
import { createId } from '../id';
import type { Photo, RectPx } from './types';

/** Long edge used for normalized source photos. */
export const MAX_SOURCE_EDGE = 2200;
/** Long edge used for printed tiles/cells. */
export const MAX_TILE_EDGE = 1800;

/** Photos can be picked on native; the web picker is a file input we don't wire up. */
export function canPickPhotos(): boolean {
  return Platform.OS !== 'web';
}

export async function pickPhotos(limit: number): Promise<Photo[]> {
  if (!canPickPhotos()) {
    throw new ToolError('image', 'Picking photos is not available in the browser.');
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limit > 1,
      selectionLimit: Math.max(1, limit),
      orderedSelection: true,
      quality: 1,
      exif: false,
    });
  } catch (error) {
    throw toToolError(error, 'permission');
  }

  if (result.canceled || !result.assets?.length) return [];

  const photos: Photo[] = [];
  for (const asset of result.assets.slice(0, Math.max(1, limit))) {
    photos.push(await normalizePhoto(asset));
  }
  return photos;
}

/**
 * Loads the picked file through the image decoder (which applies EXIF rotation),
 * caps the resolution and re-saves it as a JPEG with true pixel dimensions.
 */
export async function normalizePhoto(asset: ImagePicker.ImagePickerAsset): Promise<Photo> {
  try {
    const context = ImageManipulator.manipulate(asset.uri, {
      maxWidth: MAX_SOURCE_EDGE,
      maxHeight: MAX_SOURCE_EDGE,
    });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });

    return {
      id: createId('photo'),
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      name: asset.fileName ?? undefined,
    };
  } catch (error) {
    throw toToolError(error, 'image');
  }
}

/** Crops a normalized photo to an integer pixel rectangle and returns the new uri. */
export async function cropPhoto(
  photo: Photo,
  rect: RectPx,
  maxEdge: number = MAX_TILE_EDGE,
): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(photo.uri);
    context.crop(rect);

    if (rect.width > maxEdge || rect.height > maxEdge) {
      if (rect.width >= rect.height) context.resize({ width: maxEdge });
      else context.resize({ height: maxEdge });
    }

    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    return saved.uri;
  } catch (error) {
    throw toToolError(error, 'image');
  }
}

/** Reads a local file as base64 (used to inline images into print HTML). */
export async function toBase64(uri: string): Promise<string> {
  try {
    return await new File(uri).base64();
  } catch (error) {
    throw toToolError(error, 'image');
  }
}

/** Writes a base64 string into the app cache and returns its file uri. */
export async function writeBase64File(base64: string, fileName: string): Promise<string> {
  const file = new File(Paths.cache, fileName);
  try {
    if (file.exists) file.delete();
    await file.write(base64);
    return file.uri;
  } catch (error) {
    throw toToolError(error, 'image');
  }
}

/** Saves an image file to the device photo library. */
export async function saveToGallery(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new ToolError('gallery', 'Saving to Photos is not available in the browser.');
  }

  try {
    // Imported lazily on purpose: importing expo-media-library prints an
    // "Expo Go can no longer provide full access" warning at module load, which
    // would otherwise show up on every app start. The add-only
    // `saveToLibraryAsync` needs no read permission, and is the part of the
    // media library that still works in Expo Go.
    const mediaLibrary = await import('expo-media-library/legacy');
    if (typeof mediaLibrary.saveToLibraryAsync !== 'function') {
      throw new ToolError('gallery', 'Saving to Photos is not supported on this build.');
    }
    await mediaLibrary.saveToLibraryAsync(uri);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw toToolError(error, 'gallery');
  }
}

/**
 * Rasterizes a visible view (the collage preview) into a PNG file for sharing or
 * saving. The view must be on screen while capturing.
 */
export async function capturePng(
  viewRef: RefObject<HostInstance | null>,
  pixelWidth: number,
  aspect: number,
): Promise<string> {
  if (!viewRef.current) {
    throw new ToolError('image', 'Nothing to capture yet.');
  }
  try {
    const width = Math.max(320, Math.round(pixelWidth));
    const height = Math.max(320, Math.round(width / Math.max(aspect, 0.01)));
    const target = viewRef as unknown as Parameters<typeof captureRef>[0];
    return await captureRef(target, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width,
      height,
    });
  } catch (error) {
    throw toToolError(error, 'image');
  }
}
