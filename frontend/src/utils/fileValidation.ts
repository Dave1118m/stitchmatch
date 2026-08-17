/**
 * Client-side file upload pre-validation utility.
 * Validates file format, MIME type, and size limits before sending network requests.
 */

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an image file before upload.
 * @param file The file to validate
 * @param maxSizeBytes Custom max size limit (defaults to 10MB)
 * @returns ValidationResult with boolean status and descriptive error message if invalid
 */
export function validateImageFile(
  file: File | null | undefined,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): ValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file selected. Please choose an image file.' };
  }

  // 1. Check empty file
  if (file.size === 0) {
    return { isValid: false, error: 'The selected file is empty (0 bytes). Please choose a valid image.' };
  }

  // 2. Check maximum size (10MB default)
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const limitMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds the ${limitMb}MB limit (Selected file is ${sizeMb}MB). Please upload a smaller image.`,
    };
  }

  // 3. Check MIME type and extension
  const mimeType = file.type?.toLowerCase();
  const fileName = file.name?.toLowerCase() || '';
  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const hasValidMime = !mimeType || ALLOWED_IMAGE_MIME_TYPES.includes(mimeType) || mimeType.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    return {
      isValid: false,
      error: `Unsupported file type (${file.type || fileName.split('.').pop()}). Allowed formats: JPG, PNG, WEBP, GIF.`,
    };
  }

  return { isValid: true };
}
