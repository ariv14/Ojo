import { NextResponse } from 'next/server'
import { HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, s3Config } from '@/lib/s3'

interface HealthCheck {
  name: string
  status: 'pass' | 'fail'
  message: string
}

export async function GET() {
  const checks: HealthCheck[] = []

  // Check 1: Environment variables
  const envVars = {
    R2_BUCKET: process.env.R2_BUCKET,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? '[SET]' : undefined,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '[SET]' : undefined,
  }

  const missingVars = Object.entries(envVars)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing: ${missingVars.join(', ')}`,
    })
  } else {
    checks.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All R2 environment variables are configured',
    })
  }

  // Check 2: Bucket accessibility
  try {
    const s3Client = getS3Client()
    const command = new HeadBucketCommand({ Bucket: s3Config.bucket })
    await s3Client.send(command)

    checks.push({
      name: 'Bucket Access',
      status: 'pass',
      message: `Bucket "${s3Config.bucket}" is accessible`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    checks.push({
      name: 'Bucket Access',
      status: 'fail',
      message: `Cannot access bucket: ${errorMessage}`,
    })
  }

  // Check 3: Presigned URL generation
  try {
    const s3Client = getS3Client()
    const testKey = `health-check/${Date.now()}.txt`
    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: testKey,
      ContentType: 'text/plain',
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    })

    if (presignedUrl && presignedUrl.includes(s3Config.bucket)) {
      checks.push({
        name: 'Presigned URL Generation',
        status: 'pass',
        message: 'Presigned URLs can be generated successfully',
      })
    } else {
      checks.push({
        name: 'Presigned URL Generation',
        status: 'fail',
        message: 'Presigned URL generated but may be invalid',
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    checks.push({
      name: 'Presigned URL Generation',
      status: 'fail',
      message: `Cannot generate presigned URLs: ${errorMessage}`,
    })
  }

  // Check 4: Public URL configuration
  if (s3Config.publicUrl) {
    checks.push({
      name: 'Public URL',
      status: 'pass',
      message: `Public URL configured: ${s3Config.publicUrl}`,
    })
  } else {
    checks.push({
      name: 'Public URL',
      status: 'fail',
      message: 'R2_PUBLIC_URL is not configured',
    })
  }

  // CORS note - can only be verified in browser
  checks.push({
    name: 'CORS Policy',
    status: 'pass',
    message: 'CORS must be verified from browser (see documentation)',
  })

  // Calculate overall status
  const failedChecks = checks.filter((c) => c.status === 'fail')
  const overallStatus = failedChecks.length === 0 ? 'healthy' : 'unhealthy'

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    bucket: s3Config.bucket,
    endpoint: s3Config.endpoint ? '[CONFIGURED]' : '[NOT SET]',
    checks,
    corsNote:
      'CORS policy must be configured in Cloudflare Dashboard. Without CORS, browser uploads will fail with "Failed to fetch" error.',
  })
}
