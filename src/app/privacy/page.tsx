'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="w-full md:max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full md:max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl p-6 space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">Last updated: January 26, 2025</p>
            <p className="text-gray-700">
              OJO (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the OJO application.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>

            <h3 className="font-medium text-gray-800 mb-2">1.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li><strong>Profile Information:</strong> Username and profile picture (synced from your World App profile), plus optional details you provide like country, age, and bio</li>
              <li><strong>Content:</strong> Posts, comments, photos, videos, and messages you create</li>
              <li><strong>Communications:</strong> Support tickets and feedback you submit</li>
            </ul>

            <h3 className="font-medium text-gray-800 mb-2">1.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li><strong>World ID:</strong> Your nullifier hash (anonymous identifier from World ID verification)</li>
              <li><strong>World App Profile:</strong> Your username and profile picture are automatically fetched from World App during sign-in</li>
              <li><strong>Wallet Address:</strong> For processing WLD payments (tips, premium content, etc.)</li>
              <li><strong>Usage Data:</strong> Profile views, interactions (likes, follows), and app activity</li>
            </ul>

            <h3 className="font-medium text-gray-800 mb-2">1.3 Information We Do NOT Collect</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Biometric data (this is processed by World ID, not OJO)</li>
              <li>Location data beyond country (which you provide)</li>
              <li>Contact lists or phone numbers</li>
              <li>Browsing history outside OJO</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>To create and maintain your account</li>
              <li>To display your profile and content to other users</li>
              <li>To process payments (tips, premium content unlocks, boosts)</li>
              <li>To send notifications about activity on your content</li>
              <li>To enforce our Terms of Service and community guidelines</li>
              <li>To respond to support requests</li>
              <li>To improve the app and fix bugs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Information Sharing</h2>
            <p className="text-gray-700 mb-3">We do not sell your personal information. We may share information:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>Publicly:</strong> Your profile, posts, and interactions are visible to other users based on your privacy settings</li>
              <li><strong>With Service Providers:</strong> Supabase (database), Cloudflare (media storage), World/Worldcoin (authentication and payments)</li>
              <li><strong>For Legal Reasons:</strong> If required by law or to protect rights and safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Storage & Security</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Data is stored securely using Supabase (PostgreSQL) with encryption at rest</li>
              <li>Media files are stored on Cloudflare R2 with secure access controls</li>
              <li>We use HTTPS for all data transmission</li>
              <li>Session data is stored locally on your device</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Your account data is retained until you delete your account</li>
              <li>Support tickets are automatically deleted after 30 days</li>
              <li>When you delete your account, all associated data is permanently removed</li>
              <li>Some data may be retained in backups for up to 30 days after deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Your Rights & Choices</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>Access:</strong> View your data in your profile settings</li>
              <li><strong>Edit:</strong> Update your profile information at any time</li>
              <li><strong>Delete:</strong> Delete individual posts or your entire account</li>
              <li><strong>Visibility:</strong> Enable &quot;Invisible Mode&quot; to browse without profile views being recorded</li>
              <li><strong>Disable Profile:</strong> Temporarily hide your profile from other users</li>
              <li><strong>Notifications:</strong> Control notification preferences in World App settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Children&apos;s Privacy</h2>
            <p className="text-gray-700">
              OJO is not intended for users under 18 years of age. World ID Orb verification, which is required to use OJO, is only available to adults. We do not knowingly collect information from children under 18.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. International Users</h2>
            <p className="text-gray-700">
              OJO operates globally. By using OJO, you consent to the transfer of your information to servers located outside your country of residence, which may have different data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of OJO after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy or your data, please contact us through the in-app Support feature or visit our support page.
            </p>
          </section>

          <div className="pt-4 border-t">
            <button
              onClick={() => router.push('/support')}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
