import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    useWebWorker: true,
    initialQuality: 0.85,
    preserveExif: true,
  }

  return await imageCompression(file, options)
}
