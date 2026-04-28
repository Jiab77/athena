'use client'

import { useState, useRef, useEffect } from 'react'
import { Lock, Zap, Users, Code, Download, Upload, MessageCircle, Settings, MonitorDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingActionButton } from '@/components/floating-action-button'
import { CharacterRender } from '@/components/character-render'
import { SettingsPanel } from '@/components/settings-panel'
import { CyberpunkBackground } from '@/components/cyberpunk-background'
import { MergedCompanionChat } from '@/components/merged-companion-chat'
import { ExportModal } from '@/components/export-modal'
import { ImportModal } from '@/components/import-modal'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { useTranslation } from '@/hooks/use-translation'
import {
  DEFAULT_COMPANION,
  DEFAULT_PERSONALITY,
  DEFAULT_COMPANION_ID,
  DEFAULT_COMPANION_NAME,
  DEFAULT_VOICE_PROVIDER,
  DEFAULT_VOICE_ID,
  DEFAULT_AVATAR_CATEGORY,
  DEFAULT_GENDER,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_VISUAL_FORMAT,
  ENABLE_VOICE_OUTPUT,
  PERSONALITY_TRAITS,
  AVATARS
} from '@/lib/constants'
import type { PersonalityType, CompanionData, VisualFormat } from '@/lib/types'
import { useDB } from '@/lib/db-context'
import { getAPIKey } from '@/lib/utils'

export default function Home() {
  const [showCompanion, setShowCompanion] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [companion, setCompanion] = useState<CompanionData>(DEFAULT_COMPANION)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(ENABLE_VOICE_OUTPUT)
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID)
  const [voiceProvider, setVoiceProvider] = useState(DEFAULT_VOICE_PROVIDER)
  const [visualFormat, setVisualFormat] = useState<VisualFormat>(DEFAULT_VISUAL_FORMAT)
  const { db, dbReady } = useDB()
  const { isOnline, refresh: refreshConnectionStatus } = useConnectionStatus()
  const { canInstall, install } = usePWAInstall()
  const { t } = useTranslation()
  const featuresRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load companion and voice settings when DB becomes ready
  useEffect(() => {
    if (!dbReady || !db) return

    const loadSettings = async () => {
      try {
        const settings = await db.getSettings()
        if (settings) {
          // Get ALL companion aspects from settings
          const companionId = settings.selectedCompanion || DEFAULT_COMPANION_ID
          const companionName = settings.selectedCompanionName || DEFAULT_COMPANION_NAME
          const personality = (settings.selectedPersonality || DEFAULT_PERSONALITY) as PersonalityType
          const avatarCategory = settings.avatarCategory || DEFAULT_AVATAR_CATEGORY
          const avatarGender = settings.avatarGender || DEFAULT_GENDER
          const avatarColorScheme = settings.avatarColorScheme || DEFAULT_COLOR_SCHEME

          // Find the matching avatar from AVATARS array
          const selectedAvatar = AVATARS.find(
            (a) => a.category === avatarCategory && a.gender === avatarGender && a.colorScheme === avatarColorScheme
          )

          // Build companion with ALL aspects
          setCompanion({
            id: companionId,
            name: companionName,
            personality,
            appearance: DEFAULT_COMPANION.appearance,
            imageUrl: selectedAvatar?.imageUrl || DEFAULT_COMPANION.imageUrl,
            createdAt: DEFAULT_COMPANION.createdAt,
          })

          // Load voice settings
          setVoiceOutputEnabled(settings.voiceOutputEnabled ?? ENABLE_VOICE_OUTPUT)
          setSelectedVoice(settings.selectedVoice || DEFAULT_VOICE_ID)
          setVoiceProvider(settings.voiceProvider || DEFAULT_VOICE_PROVIDER)

          // Load visual format
          if (settings.visualFormat) setVisualFormat(settings.visualFormat as VisualFormat)
        }
      } catch (error) {
        // ignore
      }
    }
    loadSettings()
  }, [db, dbReady])

  // Refresh companion and voice settings when settings are saved
  const handleSettingsSaved = async () => {
    if (!db) return

    try {
      const settings = await db.getSettings()

      if (settings) {
        // Get ALL companion aspects from settings
        const companionId = settings.selectedCompanion || DEFAULT_COMPANION_ID
        const companionName = settings.selectedCompanionName || DEFAULT_COMPANION_NAME
        const personality = (settings.selectedPersonality || DEFAULT_PERSONALITY) as PersonalityType
        const avatarCategory = settings.avatarCategory || DEFAULT_AVATAR_CATEGORY
        const avatarGender = settings.avatarGender || DEFAULT_GENDER
        const avatarColorScheme = settings.avatarColorScheme || DEFAULT_COLOR_SCHEME

        // Find the matching avatar from AVATARS array
        const selectedAvatar = AVATARS.find(
          (a) => a.category === avatarCategory && a.gender === avatarGender && a.colorScheme === avatarColorScheme
        )

        // Build companion with ALL aspects
        setCompanion({
          id: companionId,
          name: companionName,
          personality,
          appearance: DEFAULT_COMPANION.appearance,
          imageUrl: selectedAvatar?.imageUrl || DEFAULT_COMPANION.imageUrl,
          createdAt: DEFAULT_COMPANION.createdAt,
        })

        // Update voice settings
        setVoiceOutputEnabled(settings.voiceOutputEnabled ?? ENABLE_VOICE_OUTPUT)
        setSelectedVoice(settings.selectedVoice || DEFAULT_VOICE_ID)
        setVoiceProvider(settings.voiceProvider || DEFAULT_VOICE_PROVIDER)

        // Update visual format
        if (settings.visualFormat) setVisualFormat(settings.visualFormat as VisualFormat)
      }

      refreshConnectionStatus()
    } catch (error) {
      // ignore
    }
  }

  // Handle voice mode toggle — activating hides chat and enables TTS if a key is configured
  const handleVoiceModeToggle = async () => {
    const activating = !isVoiceMode
    setIsVoiceMode(activating)

    if (activating) {
      setIsChatVisible(false)

      // Auto-enable voice output if a TTS key is available and voice is currently off
      if (!voiceOutputEnabled && db) {
        try {
          const settings = await db.getSettings()
          const provider = settings?.voiceProvider || voiceProvider
          await getAPIKey(provider)
          // Key exists — enable voice output
          await handleVoiceOutputToggle()
        } catch {
          // No TTS key configured — leave voice output as-is
        }
      }
    }
  }

  // Handle voice output toggle
  const handleVoiceOutputToggle = async () => {
    if (!db) return

    try {
      const settings = await db.getSettings()
      if (settings) {
        const newVoiceOutputState = !voiceOutputEnabled
        await db.storeSettings({
          ...settings,
          voiceOutputEnabled: newVoiceOutputState,
          updatedAt: new Date().toISOString(),
        })
        setVoiceOutputEnabled(newVoiceOutputState)
      }
    } catch (error) {
      // ignore
    }
  }

  // Keyboard shortcuts for export/import
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + E for export
      if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
        event.preventDefault()
        setShowExportModal(true)
      }
      // Cmd/Ctrl + I for import
      if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
        event.preventDefault()
        handleImport()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleImport = () => {
    try {
      fileInputRef.current?.click()
    } catch (error) {
      alert('Import failed. Check console for details.')
    }
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setSelectedImportFile(file)
      setShowImportModal(true)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      alert('Error processing file. Check console for details.')
    }
  }

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Privacy First',
      description:
        'All conversations encrypted locally. Your data never leaves your device.',
      color: 'from-primary/20 to-primary/5',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Always On',
      description:
        'Floating companion widget. Interact anytime from any application.',
      color: 'from-accent/20 to-accent/5',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Personalized',
      description:
        'Train your companion to think and act like you. True digital legacy.',
      color: 'from-primary/20 to-accent/20',
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: 'Open Source',
      description:
        'Community-driven development. Transparent, auditable, and secure.',
      color: 'from-accent/20 to-primary/20',
    },
  ]

  return (
    <main className="min-h-screen text-foreground overflow-x-hidden relative">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.md,.markdown"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      <CyberpunkBackground />

      {/* Hero Section - Cyberpunk Style */}
      <div className="relative overflow-hidden pt-20 pb-32 sm:pt-40 sm:pb-48">
        {/* Neon Glow Background */}
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl sm:px-0 lg:px-8 text-center z-10">
          {/* Glitch Effect Header */}
          <div className="mb-6 relative inline-block">
            <h1 className="text-7xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-pulse">
              ATHENA
            </h1>
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-50 -z-10" />
          </div>

          <p className="mx-auto max-w-3xl text-lg sm:text-2xl font-light text-foreground/90 mb-12 leading-relaxed">
            Your <span className="text-primary font-semibold">privacy-first</span> AI companion.<br />
            <span className="text-accent">Always floating by your side.</span> <span className="text-primary">Never exposing your data.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setShowCompanion(true)}
              className="bg-primary hover:bg-primary/80 text-foreground font-bold px-8 py-6 text-lg rounded-lg border-2 border-primary/50 shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all cursor-pointer"
            >
              ⚡ ACTIVATE ATHENA
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToFeatures}
              className="border-2 border-accent text-accent hover:text-accent font-bold px-8 py-6 text-lg rounded-lg hover:shadow-accent/50 hover:shadow-lg transition-all bg-transparent cursor-pointer hover:bg-accent/5"
            >
              LEARN MORE
            </Button>
          </div>

          {/* Status Indicator */}
          <div className="mt-12 flex items-center justify-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-primary' : 'bg-gray-500'}`} />
            <span className={isOnline ? 'text-muted-foreground' : 'text-gray-500'}>
              {isOnline ? 'SYSTEM ONLINE • READY FOR DEPLOYMENT' : 'SYSTEM OFFLINE • PLEASE CONFIGURE'}
            </span>
          </div>
        </div>
      </div>

      {/* Features Grid - Neon Cards */}
      <div className="py-32 relative z-10" ref={featuresRef}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-20 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              WHY CHOOSE ATHENA
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`relative group bg-gradient-to-br ${feature.color} border-2 border-border rounded-lg p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20`}
              >
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 rounded-lg transition-all duration-300" />

                <div className="relative">
                  <div className="text-primary mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 uppercase tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Character Preview Section - Split Layout */}
      <div className="py-32 relative z-10 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-black mb-20 text-center tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              YOUR COMPANION AWAITS
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Character Visual */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur-2xl opacity-50" />
              <div className="relative bg-background border-2 border-primary/30 rounded-xl p-8 hover:border-primary/50 transition-colors">
                <CharacterRender
                  companionName={companion.name}
                  imageUrl={companion.imageUrl}
                  visualFormat={visualFormat}
                  animating={false}
                />
              </div>
            </div>

            {/* Character Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-3 tracking-tight">
                  {DEFAULT_COMPANION_NAME}
                </h3>
                <p className="text-xl text-foreground/80 font-light">
                  {PERSONALITY_TRAITS[DEFAULT_PERSONALITY]}
                </p>
              </div>

              <div className="space-y-4 text-muted-foreground">
                <div className="flex gap-3">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0 mt-1" />
                  <p>
                    Your thinking companion. Share your interests, and watch as she learns to understand your perspective.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-1 bg-accent rounded-full flex-shrink-0 mt-1" />
                  <p>
                    Every conversation encrypted and stored locally. Your thoughts and ideas are yours alone.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={() => {
                    setShowCompanion(true)
                    setIsChatVisible(true)
                  }}
                  className="bg-primary hover:bg-primary/80 text-foreground font-bold px-6 py-3 rounded-lg border border-primary/50 shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all cursor-pointer"
                >
                  💬 START CHATTING
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Bold Cyberpunk */}
      <div className="py-32 relative z-10 border-t border-border/30">
        <div className="mx-auto max-w-4xl py-6 sm:px-4 lg:py-12 text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-3xl opacity-40" />
            <div className="relative bg-background border-2 border-primary/30 rounded-2xl px-4 py-6">
              <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-8 tracking-tight">
                READY TO DEPLOY?
              </h2>
              <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                Click the floating button below to activate Athena. No sign-up required. Your privacy is guaranteed.
              </p>
              <Button
                size="lg"
                onClick={() => setShowCompanion(true)}
                className="bg-accent hover:bg-accent/80 text-foreground font-bold px-4 sm:px-8 py-6 text-lg rounded-lg border-2 border-accent/50 shadow-lg shadow-accent/50 hover:shadow-accent/70 transition-all cursor-pointer"
              >
                🚀 LAUNCH ATHENA
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        items={[
          // Install item only appears when the browser deems the PWA installable
          // and it has not already been installed. iOS Safari does not fire
          // beforeinstallprompt, so canInstall stays false there (expected).
          ...(canInstall
            ? [
                {
                  id: 'install',
                  label: t('fab.install'),
                  icon: <MonitorDown className="h-5 w-5" />,
                  onClick: () => {
                    void install()
                  },
                },
              ]
            : []),
          {
            id: 'export',
            label: t('fab.export'),
            icon: <Download className="h-5 w-5" />,
            onClick: () => setShowExportModal(true),
          },
          {
            id: 'import',
            label: t('fab.import'),
            icon: <Upload className="h-5 w-5" />,
            onClick: handleImport,
          },
          {
            id: 'companion',
            label: t('fab.companion'),
            icon: <MessageCircle className="h-5 w-5" />,
            onClick: () => setShowCompanion(true),
          },
          {
            id: 'settings',
            label: t('fab.settings'),
            icon: <Settings className="h-5 w-5" />,
            onClick: () => setShowSettings(true),
          },
        ]}
      />

      {/* Export Modal */}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setSelectedImportFile(null)
        }}
        file={selectedImportFile}
      />

      {/* Responsive Windows Container */}
      {showCompanion && (
        <MergedCompanionChat
          isOpen={showCompanion}
          onClose={() => setShowCompanion(false)}
          isChatVisible={isChatVisible}
          setIsChatVisible={setIsChatVisible}
          isVoiceMode={isVoiceMode}
          onVoiceModeToggle={handleVoiceModeToggle}
          isOnline={isOnline}
          companion={companion}
          voiceOutputEnabled={voiceOutputEnabled}
          selectedVoice={selectedVoice}
          voiceProvider={voiceProvider}
          onVoiceOutputToggle={handleVoiceOutputToggle}
          visualFormat={visualFormat}
        />
      )}

      {showSettings && (
        <div className="fixed bottom-24 z-40 inset-x-4 md:inset-x-auto md:right-6 md:w-96">
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onSettingsSaved={handleSettingsSaved}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="relative w-full py-6 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/50">
          <a
            href="https://github.com/Jiab77/athena"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Athena
          </a>
          {' '}is made with ❤️ by{' '}
          <a
            href="https://github.com/Jiab77"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Jiab77
          </a>
          {' '}and{' '}
          <a
            href="https://v0.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            v0
          </a>
        </p>
      </footer>
    </main>
  )
}
