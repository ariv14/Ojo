import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, s3Config, generateS3Key, generateThumbnailKey } from '@/lib/s3'

interface FileRequest {
  filename: string
  contentType: string
  index: number
}

interface UploadRequest {
  userId: string
  postId: string
  files: FileRequest[]
  includeThumbnail?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json()
    const { userId, postId, files, includeThumbnail } = body

    // Validate request
    if (!userId || !postId || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, postId, files' },
        { status: 400 }
      )
    }

    // Max 10 files for albums
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files allowed per post' },
        { status: 400 }
      )
    }

    const s3Client = getS3Client()
    const presignedUrls: Array<{
      index: number
      key: string
      presignedUrl: string
    }> = []

    // Generate presigned URLs for each file
    for (const file of files) {
      const key = generateS3Key(userId, postId, file.filename, file.index)

      const command = new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        ContentType: file.contentType,
      })

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // 1 hour
      })

      presignedUrls.push({
        index: file.index,
        key,
        presignedUrl,
      })
    }

    // Generate presigned URL for thumbnail if requested (for reels)
    let thumbnailUpload: { key: string; presignedUrl: string } | null = null
    if (includeThumbnail) {
      const thumbnailKey = generateThumbnailKey(userId, postId)
      const thumbnailCommand = new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: thumbnailKey,
        ContentType: 'image/jpeg',
      })

      const thumbnailPresignedUrl = await getSignedUrl(s3Client, thumbnailCommand, {
        expiresIn: 3600,
      })

      thumbnailUpload = {
        key: thumbnailKey,
        presignedUrl: thumbnailPresignedUrl,
      }
    }

    return NextResponse.json({
      success: true,
      uploads: presignedUrls,
      thumbnail: thumbnailUpload,
    })
  } catch (error) {
    console.error('S3 presigned URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URLs' },
      { status: 500 }
    )
  }
}
