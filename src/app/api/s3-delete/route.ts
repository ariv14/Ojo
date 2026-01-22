import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { getS3Client, s3Config } from '@/lib/s3'

interface DeleteRequest {
  keys: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteRequest = await request.json()
    const { keys } = body

    // Validate request
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: keys (array of S3 keys)' },
        { status: 400 }
      )
    }

    // Limit number of keys that can be deleted at once
    if (keys.length > 15) {
      return NextResponse.json(
        { error: 'Maximum 15 keys can be deleted at once' },
        { status: 400 }
      )
    }

    const s3Client = getS3Client()

    const command = new DeleteObjectsCommand({
      Bucket: s3Config.bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    })

    await s3Client.send(command)

    return NextResponse.json({
      success: true,
      deletedCount: keys.length,
    })
  } catch (error) {
    console.error('S3 delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete S3 objects' },
      { status: 500 }
    )
  }
}
