'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TermsOfServicePage() {
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
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full md:max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl p-6 space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">Last updated: January 25, 2025</p>
            <p className="text-gray-700">
              Welcome to Ojo. By using our application, you agree to these Terms of Service. Please read them carefully.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing or using Ojo, you agree to be bound by these Terms of Service and our{' '}
              <Link href="/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
              If you do not agree to these terms, you may not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Eligibility</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>You must be at least 18 years old to use Ojo</li>
              <li>You must complete World ID Orb verification to create an account</li>
              <li>You may only have one account per person (enforced via World ID)</li>
              <li>You must not be banned or previously removed from Ojo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Your Account</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>You are responsible for all activity on your account</li>
              <li>You must provide accurate information in your profile</li>
              <li>You may not impersonate another person or entity</li>
              <li>You may not share or transfer your account to others</li>
              <li>You can delete your account at any time through profile settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. User Content</h2>

            <h3 className="font-medium text-gray-800 mb-2">4.1 Your Content</h3>
            <p className="text-gray-700 mb-3">
              You retain ownership of content you post. By posting content, you grant Ojo a non-exclusive, royalty-free license to display, distribute, and promote your content within the app.
            </p>

            <h3 className="font-medium text-gray-800 mb-2">4.2 Content Standards</h3>
            <p className="text-gray-700 mb-2">You agree not to post content that:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Is illegal, harmful, or violates others&apos; rights</li>
              <li>Contains nudity, sexual content, or pornography</li>
              <li>Promotes violence, self-harm, or dangerous activities</li>
              <li>Is harassing, bullying, or discriminatory</li>
              <li>Contains spam, scams, or misleading information</li>
              <li>Infringes on intellectual property rights</li>
              <li>Contains malware or malicious code</li>
              <li>Impersonates others or misrepresents your identity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Prohibited Conduct</h2>
            <p className="text-gray-700 mb-2">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Create fake accounts or bypass World ID verification</li>
              <li>Use bots, scrapers, or automated tools</li>
              <li>Manipulate engagement metrics (fake likes, follows, etc.)</li>
              <li>Harass, stalk, or threaten other users</li>
              <li>Collect or store other users&apos; personal information</li>
              <li>Interfere with or disrupt the app&apos;s functionality</li>
              <li>Attempt to access other users&apos; accounts</li>
              <li>Use Ojo for any illegal purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Payments & Transactions</h2>

            <h3 className="font-medium text-gray-800 mb-2">6.1 WLD Payments</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li>All payments are made in WLD tokens via World App</li>
              <li>Premium content unlocks: 1.0 WLD (80% to creator, 20% platform fee)</li>
              <li>Tips: 0.5 WLD (80% to creator, 20% platform fee)</li>
              <li>Post boosts: 5.0 WLD (100% platform)</li>
              <li>Invisible mode: 5.0 WLD for 30 days</li>
            </ul>

            <h3 className="font-medium text-gray-800 mb-2">6.2 Refunds</h3>
            <p className="text-gray-700">
              All transactions are final. Due to the nature of blockchain transactions, we cannot process refunds. Please ensure you intend to make a purchase before confirming.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Premium Content</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Creators may mark content as premium, requiring payment to view</li>
              <li>Once unlocked, premium content remains accessible to you</li>
              <li>Premium content must still comply with all content standards</li>
              <li>Ojo is not responsible for the quality of premium content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Moderation & Enforcement</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>We may remove content that violates these terms</li>
              <li>We may suspend or ban accounts for violations</li>
              <li>We may hide posts pending review based on user reports</li>
              <li>Decisions are made at our discretion and may not be appealed</li>
              <li>Repeated violations will result in permanent bans</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Intellectual Property</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Ojo and its features, design, and branding are our property</li>
              <li>You may not copy, modify, or distribute Ojo&apos;s code or design</li>
              <li>User content remains the property of its creators</li>
              <li>Report copyright violations through our support system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Third-Party Services</h2>
            <p className="text-gray-700">
              Ojo integrates with World ID, World App, Supabase, and Cloudflare. Your use of these services is subject to their respective terms and privacy policies. We are not responsible for third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Disclaimers</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Ojo is provided &quot;as is&quot; without warranties of any kind</li>
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>We are not responsible for user-generated content</li>
              <li>We are not responsible for lost data or earnings</li>
              <li>Use Ojo at your own risk</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, Ojo and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these Terms of Service at any time. We will notify you of significant changes through the app. Continued use after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">14. Termination</h2>
            <p className="text-gray-700">
              We may terminate or suspend your access to Ojo at any time, for any reason, without notice. Upon termination, your right to use the app ceases immediately. Provisions that should survive termination will remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">15. Contact</h2>
            <p className="text-gray-700">
              For questions about these Terms of Service, please contact us through the in-app Support feature.
            </p>
          </section>

          <div className="pt-4 border-t space-y-3">
            <Link
              href="/privacy"
              className="block w-full py-3 border border-gray-300 rounded-lg font-medium text-center hover:bg-gray-50 transition"
            >
              View Privacy Policy
            </Link>
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
