import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, s3Config, generateAvatarKey } from '@/lib/s3'

interface AvatarUploadRequest {
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AvatarUploadRequest = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    const s3Client = getS3Client()
    const key = generateAvatarKey(userId)

    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
      ContentType: 'image/jpeg',
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    })

    return NextResponse.json({
      success: true,
      key,
      presignedUrl,
    })
  } catch (error) {
    console.error('Avatar presigned URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
