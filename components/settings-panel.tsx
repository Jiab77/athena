'use client'

import { useState, useEffect } from 'react'
import { Lock, Info, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  DEFAULT_AVATAR_CATEGORY,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_COMPANION_ID,
  DEFAULT_COMPANION_NAME,
  DEFAULT_GENDER,
  DEFAULT_MODEL_ID,
  DEFAULT_MODEL_PROVIDER,
  DEFAULT_PERSONALITY,
  DEFAULT_VISUAL_FORMAT,
  DEFAULT_MEMORY_SIZE,
  MIN_MEMORY_SIZE,
  MAX_MEMORY_SIZE,
  LLM_PROVIDERS,
  TTS_PROVIDERS,
  TTS_VOICES,
  AVATARS,
  PERSONALITIES,
  PERSONALITY_TRAITS,
  AVATAR_CATEGORIES,
  GENDERS,
  COLOR_SCHEMES,
  VISUAL_FORMATS
} from '@/lib/constants'
import type { PersonalityType, VisualFormat, GenderType, TTSProvider } from '@/lib/types'
import { useDB } from '@/lib/db-context'
import { encryptData, decryptData } from '@/lib/crypto'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n'

interface SettingsPanelProps {
  onClose: () => void
  onSettingsSaved?: () => void
}

export function SettingsPanel({ onClose, onSettingsSaved }: SettingsPanelProps) {
  const { toast } = useToast()
  const { db, dbReady } = useDB()
  const { t, locale, setLocale } = useTranslation()
  const [companion, setCompanion] = useState(DEFAULT_COMPANION_ID)
  const [avatarCategory, setAvatarCategory] = useState<(typeof AVATAR_CATEGORIES)[number]>(DEFAULT_AVATAR_CATEGORY)
  const [avatarGender, setAvatarGender] = useState<GenderType>(DEFAULT_GENDER)
  const [avatarColorScheme, setAvatarColorScheme] = useState<(typeof COLOR_SCHEMES)[number]>(DEFAULT_COLOR_SCHEME)
  const [companionName, setCompanionName] = useState(DEFAULT_COMPANION_NAME)
  const [personalityType, setPersonalityType] = useState<PersonalityType>(DEFAULT_PERSONALITY)
  const [personalityTraits, setPersonalityTraits] = useState(PERSONALITY_TRAITS[DEFAULT_PERSONALITY])
  const [visualFormat, setVisualFormat] = useState<VisualFormat>(DEFAULT_VISUAL_FORMAT)
  const [provider, setProvider] = useState(DEFAULT_MODEL_PROVIDER)
  const [model, setModel] = useState(DEFAULT_MODEL_ID)
  const [memoryWindowSize, setMemoryWindowSize] = useState(DEFAULT_MEMORY_SIZE)
  const [customProviderName, setCustomProviderName] = useState('')
  const [customProviderUrl, setCustomProviderUrl] = useState('')
  const [customModelName, setCustomModelName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [privacyMode, setPrivacyMode] = useState(true) // Default to privacy-first
  const [showApiKey, setShowApiKey] = useState(false)
  const [voiceProvider, setVoiceProvider] = useState<string>('openai')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [voiceApiKey, setVoiceApiKey] = useState('')
  const [showVoiceApiKey, setShowVoiceApiKey] = useState(false)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const [hasSTTSupport, setHasSTTSupport] = useState(false)
  const [customSTTModelName, setCustomSTTModelName] = useState('')
  const [customSTTUrl, setCustomSTTUrl] = useState('')
  const [streamingMode, setStreamingMode] = useState(false)
  const [decartApiKey, setDecartApiKey] = useState('')
  const [showDecartApiKey, setShowDecartApiKey] = useState(false)

  const isLiveAvatar = visualFormat === 'live-avatar'
  const isCustomProvider = provider === 'custom'
  const isBioLLM = provider === 'biollm'
  const selectedProvider = LLM_PROVIDERS.find((p) => p.id === provider)
  const availableModels = selectedProvider?.models.filter(m => m.visible) || []

  // Voice settings logic
  const selectedTTSProvider = TTS_PROVIDERS.find((p) => p.id === voiceProvider)
  const isOpenAIVoice = voiceProvider === 'openai'
  const isOpenAIGlobal = provider === 'openai'
  const shouldAutoPopulateVoiceKey = isOpenAIVoice && isOpenAIGlobal
  const displayVoiceApiKey = shouldAutoPopulateVoiceKey ? apiKey : voiceApiKey

  // Get available voices based on selected provider and gender
  const availableVoices = (TTS_VOICES[voiceProvider as keyof typeof TTS_VOICES]?.[avatarGender as keyof (typeof TTS_VOICES)['openai']] as unknown as { id: string; name: string; isDefault?: boolean }[]) || []
  const defaultVoice = availableVoices.find(v => v.isDefault)?.id || availableVoices[0]?.id || ''

  // Load settings once on mount
  useEffect(() => {
    if (!dbReady || !db) return

    const loadSettings = async () => {
      try {
        // Load saved settings from IndexedDB
        const storedSettings = await db.getSettings()
        if (storedSettings) {
          // Load all avatar settings
          if (storedSettings.avatarCategory) setAvatarCategory(storedSettings.avatarCategory)
          if (storedSettings.avatarGender) setAvatarGender(storedSettings.avatarGender)
          if (storedSettings.avatarColorScheme) setAvatarColorScheme(storedSettings.avatarColorScheme)

          // Load companion settings
          if (storedSettings.selectedCompanion) setCompanion(storedSettings.selectedCompanion)
          if (storedSettings.selectedCompanionName) setCompanionName(storedSettings.selectedCompanionName)

          // Load personality settings
          if (storedSettings.selectedPersonality) setPersonalityType(storedSettings.selectedPersonality as PersonalityType)
          if (storedSettings.customPersonalityTraits) setPersonalityTraits(storedSettings.customPersonalityTraits)

          // Load visual format
          if (storedSettings.visualFormat) setVisualFormat(storedSettings.visualFormat)

          // Load memory window
          if (storedSettings.memoryWindowSize) setMemoryWindowSize(storedSettings.memoryWindowSize)

          // Load voice settings
          if (storedSettings.voiceProvider) setVoiceProvider(storedSettings.voiceProvider)
          if (storedSettings.selectedVoice) setSelectedVoice(storedSettings.selectedVoice)
          if (typeof storedSettings.voiceOutputEnabled === 'boolean') setVoiceOutputEnabled(storedSettings.voiceOutputEnabled)

          // Load custom provider settings
          if (storedSettings.customProviderName) setCustomProviderName(storedSettings.customProviderName)
          if (storedSettings.customProviderUrl) setCustomProviderUrl(storedSettings.customProviderUrl)
          if (storedSettings.customModelName) setCustomModelName(storedSettings.customModelName)
          if (typeof storedSettings.hasSTTSupport === 'boolean') setHasSTTSupport(storedSettings.hasSTTSupport)
          if (storedSettings.customSTTModelName) setCustomSTTModelName(storedSettings.customSTTModelName)
          if (storedSettings.customSTTUrl) setCustomSTTUrl(storedSettings.customSTTUrl)

          // Load privacy mode (default to true for privacy-first)
          if (typeof storedSettings.privacyMode === 'boolean') setPrivacyMode(storedSettings.privacyMode)

          // Load model: find the model id by looking up the full model string in LLM_PROVIDERS
          if (storedSettings.selectedModel) {
            const modelString = storedSettings.selectedModel
            let foundModelId = DEFAULT_MODEL_ID
            let foundProvider = DEFAULT_MODEL_PROVIDER

            for (const llmProvider of LLM_PROVIDERS) {
              const foundModel = llmProvider.models.find(m => m.model === modelString)
              if (foundModel) {
                foundModelId = foundModel.id
                foundProvider = llmProvider.id
                break
              }
            }
            setModel(foundModelId)
            setProvider(foundProvider)
          }

        }
      } catch (error) {
        // ignore
      }
    }
    loadSettings()
  }, [db, dbReady])

  // Load API key when provider changes
  useEffect(() => {
    if (!dbReady || !db) return

    const loadApiKey = async () => {
      try {
        const stored = await db.checkAPIKey(provider)
        if (stored) {
          const encrypted = JSON.parse(stored.keyEncrypted)
          const decrypted = await decryptData(encrypted, `api-key:${provider}`)
          if (decrypted) {
            setApiKey(decrypted)
          }
        } else {
          // Clear API key if no stored key for this provider
          setApiKey('')
        }
      } catch (error) {
        // ignore
      }
    }
    loadApiKey()
  }, [db, dbReady, provider])

  // Load voice API key when voice provider changes
  useEffect(() => {
    if (!dbReady || !db) return

    const loadDecartApiKey = async () => {
      try {
        const stored = await db.checkAPIKey('decart')
        if (stored) {
          const encrypted = JSON.parse(stored.keyEncrypted)
          const decrypted = await decryptData(encrypted, 'api-key:decart')
          if (decrypted) setDecartApiKey(decrypted)
        }
      } catch (error) {
        console.error('[Athena] Failed to load Decart API key:', error)
      }
    }

    const loadVoiceApiKey = async () => {
      try {
        // Skip loading if OpenAI voice uses global API key
        if (shouldAutoPopulateVoiceKey) {
          setVoiceApiKey('')
          return
        }

        const stored = await db.checkAPIKey(voiceProvider)
        if (stored) {
          const encrypted = JSON.parse(stored.keyEncrypted)
          const decrypted = await decryptData(encrypted, `api-key:${voiceProvider}`)
          if (decrypted) {
            setVoiceApiKey(decrypted)
          }
        }
      } catch (error) {
        // ignore
      }
    }

    loadVoiceApiKey()
    loadDecartApiKey()
  }, [db, dbReady, voiceProvider, shouldAutoPopulateVoiceKey])

  // Reset voice selection when voice provider changes
  useEffect(() => {
    if (!dbReady || !db) return

    const resetVoiceSelection = async () => {
      try {
        // Clear old values immediately for clean UX transition
        setSelectedVoice('')

        // Try to load saved voice for this provider from DB
        const settings = await db.getSettings()

        // Get available voices for new provider and gender
        const newAvailableVoices = (TTS_VOICES[voiceProvider as keyof typeof TTS_VOICES]?.[avatarGender as keyof (typeof TTS_VOICES)['openai']] as unknown as { id: string; name: string; isDefault?: boolean }[]) || []

        // If we have a saved voice and it exists in new provider's voices, use it
        if (settings?.selectedVoice && newAvailableVoices.some(v => v.id === settings.selectedVoice)) {
          setSelectedVoice(settings.selectedVoice)
        } else {
          const newDefaultVoice = newAvailableVoices.find(v => v.isDefault)?.id || newAvailableVoices[0]?.id || ''
          setSelectedVoice(newDefaultVoice)
        }
      } catch (error) {
        // ignore
      }
    }

    resetVoiceSelection()
  }, [db, dbReady, voiceProvider, avatarGender])

  // Update personality traits when personality type changes (skip for Custom to preserve user edits)
  useEffect(() => {
    if (personalityType !== 'Custom') {
      setPersonalityTraits(PERSONALITY_TRAITS[personalityType])
    }
  }, [personalityType])

  const handleSaveSettings = async () => {
    if (!db) return

    try {
      // Save API key to IndexedDB encrypted
      if (apiKey) {
        const encrypted = await encryptData(apiKey, `api-key:${provider}`)
        await db.storeAPIKey({
          provider,
          keyEncrypted: JSON.stringify(encrypted),
          updatedAt: new Date().toISOString(),
        })
      }

      // Save Decart API key when live-avatar format is selected
      if (isLiveAvatar && decartApiKey) {
        const encrypted = await encryptData(decartApiKey, 'api-key:decart')
        await db.storeAPIKey({
          provider: 'decart',
          keyEncrypted: JSON.stringify(encrypted),
          updatedAt: new Date().toISOString(),
        })
        console.log('[Athena] Decart API key saved securely')
      }

      // Save voice API key only if ResembleAI is selected or OpenAI is used with different global provider
      if (!shouldAutoPopulateVoiceKey && voiceApiKey) {
        const encrypted = await encryptData(voiceApiKey, `api-key:${voiceProvider}`)
        await db.storeAPIKey({
          provider: voiceProvider,
          keyEncrypted: JSON.stringify(encrypted),
          updatedAt: new Date().toISOString(),
        })
      }

      // Save all settings to IndexedDB
      const selectedProvider = LLM_PROVIDERS.find(p => p.id === provider)
      const selectedLLM = selectedProvider?.models.find(m => m.id === model)

      await db.storeSettings({
        key: 'userSettings',
        selectedModel: selectedLLM?.model || model,
        selectedProvider: provider,
        selectedPersonality: personalityType,
        customPersonalityTraits: personalityType === 'Custom' ? personalityTraits : undefined,
        selectedCompanion: companion,
        selectedCompanionName: companionName,
        avatarCategory,
        avatarGender,
        avatarColorScheme,
        visualFormat,
        memoryWindowSize,
        voiceProvider,
        selectedVoice: selectedVoice || defaultVoice,
        voiceOutputEnabled,
        privacyMode,
        customProviderName: isCustomProvider ? customProviderName : undefined,
        customProviderUrl: (isCustomProvider || isBioLLM) ? customProviderUrl : undefined,
        customModelName: isCustomProvider ? customModelName : undefined,
        hasSTTSupport: isCustomProvider ? hasSTTSupport : undefined,
        customSTTModelName: isCustomProvider && hasSTTSupport ? customSTTModelName : undefined,
        customSTTUrl: isCustomProvider && hasSTTSupport ? customSTTUrl : undefined,
        locale, // Preserve the active locale so it is not wiped on save
        updatedAt: new Date().toISOString(),
      })
      toast({
        title: t('settings.saved'),
        description: t('settings.savedDescription'),
      })

      // Dispatch event so other components can react to settings changes
      window.dispatchEvent(new CustomEvent('settings-changed'))

      onSettingsSaved?.()
      onClose()
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('settings.saveFailed'),
        variant: 'destructive',
      })
    }
  }
  const selectedAvatar = AVATARS.find(
    (a) => a.category === avatarCategory && a.gender === avatarGender && a.colorScheme === avatarColorScheme
  )

  return (
    <Card className="w-full h-120 -py-6 shadow-2xl border border-border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-foreground">⚙️ {t('settings.title').toUpperCase()}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="cursor-pointer">
          <span className="text-xl leading-none">×</span>
        </Button>
      </div>

      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="single" collapsible className="w-full px-2 py-2">
          {/* 1. Companion Section */}
          <AccordionItem value="companion" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              👧 {t('settings.sections.companion').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                {/* Avatar Preview */}
                {selectedAvatar && (
                  <div className="flex justify-center">
                    <div className="w-32 h-40 rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 bg-secondary/10">
                      <img
                        src={selectedAvatar.imageUrl || "/placeholder.svg"}
                        alt={selectedAvatar.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.companion.category')}
                  </label>
                  <Select value={avatarCategory} onValueChange={(val: (typeof AVATAR_CATEGORIES)[number]) => setAvatarCategory(val)}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category} className="focus:bg-secondary/50">
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.companion.gender')}
                  </label>
                  <Select value={avatarGender} onValueChange={(val: GenderType) => setAvatarGender(val)}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender} className="focus:bg-secondary/50">
                          {gender === 'F' ? t('settings.companion.female') : t('settings.companion.male')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color Scheme Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.companion.colorScheme')}
                  </label>
                  <Select value={avatarColorScheme} onValueChange={(val: (typeof COLOR_SCHEMES)[number]) => setAvatarColorScheme(val)}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_SCHEMES.map((scheme) => (
                        <SelectItem key={scheme} value={scheme} className="focus:bg-secondary/50">
                          {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Companion Name */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.companion.name')}
                  </label>
                  <Input
                    placeholder={t('settings.companion.namePlaceholder')}
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    className="w-full bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Customize Section */}
          <AccordionItem value="customize" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🪄 {t('settings.sections.customize').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.customize.personalityType')}
                  </label>
                  <Select value={personalityType} onValueChange={(value) => setPersonalityType(value as PersonalityType)}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONALITIES.map((personality) => (
                        <SelectItem key={personality} value={personality} className="focus:bg-secondary/50">
                          {personality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.customize.customTraits')}
                  </label>
                  <textarea
                    placeholder={t('settings.customize.customTraitsPlaceholder')}
                    value={personalityTraits}
                    onChange={(e) => setPersonalityTraits(e.target.value)}
                    onKeyDown={() => {
                      if (personalityType !== 'Custom') {
                        setPersonalityType('Custom')
                      }
                    }}
                    className="w-full h-20 bg-primary/20 border border-primary/50 text-foreground placeholder:text-muted-foreground text-sm rounded-md p-2 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.customize.customTraitsHelp')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.customize.visualFormat')}
                  </label>
                  <Select value={visualFormat} onValueChange={(val: VisualFormat) => setVisualFormat(val)}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <span className="truncate text-left">
                        {visualFormat === 'static-2d' ? 'Static 2D' : visualFormat === 'animated-2d' ? 'Animated 2D' : visualFormat === 'animated-3d' ? '2.5D Avatar' : 'Live Avatar'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {VISUAL_FORMATS.map((format) => {
                        const formatLabels = {
                          'static-2d': { label: 'Static 2D', info: 'Low GPU usage' },
                          'animated-2d': { label: 'Animated 2D', info: 'Three.js shader animation' },
                          'animated-3d': { label: '2.5D Avatar', info: 'Motion portrait — parallax depth from photo' },
                          'live-avatar': { label: 'Live Avatar', info: 'Decart AI — real-time animation' },
                        } as const
                        const { label, info } = formatLabels[format]
                        return (
                          <SelectItem key={format} value={format} className="focus:bg-secondary/50">
                            <div className="flex flex-col">
                              <span>{label}</span>
                              <span className="text-xs text-muted-foreground">{info}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {/* Decart API key — shown only when Live Avatar is selected */}
                  {isLiveAvatar && (
                    <div className="mt-3 space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <label className="block text-xs font-semibold text-foreground">
                        {t('settings.customize.decartApiKey')}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showDecartApiKey ? 'text' : 'password'}
                          placeholder={t('settings.customize.decartApiKeyPlaceholder')}
                          value={decartApiKey}
                          onChange={(e) => setDecartApiKey(e.target.value)}
                          className="flex-1 bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowDecartApiKey(!showDecartApiKey)}
                          className="cursor-pointer h-9 w-9"
                        >
                          {showDecartApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.customize.decartApiKeyHelpStart')}{' '}
                        <a
                          href="https://platform.decart.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          platform.decart.ai
                        </a>
                        {t('settings.customize.decartApiKeyHelpEnd')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Model Section */}
          <AccordionItem value="model" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🤖 {t('settings.sections.model').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.model.provider')}
                  </label>
                  <Select value={provider} onValueChange={(val) => {
                    setProvider(val)
                    if (val !== 'custom') {
                      const newProvider = LLM_PROVIDERS.find((p) => p.id === val)
                      if (newProvider?.models.length) {
                        setModel((newProvider.models.find(m => m.visible) ?? newProvider.models[0]).id)
                      }
                    }
                  }}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <span className="truncate text-left">
                        {LLM_PROVIDERS.find(p => p.id === provider)?.name ?? (provider === 'custom' ? t('settings.model.customProvider') : provider)}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="focus:bg-secondary/50">
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">{t('settings.model.modelsCount', { count: p.models.filter(m => m.visible).length })}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="focus:bg-secondary/50">
                        <span className="text-primary font-semibold">{t('settings.model.customProviderOption')}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Provider Fields */}
                {isCustomProvider && (
                  <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        {t('settings.model.providerName')}
                      </label>
                      <Input
                        placeholder={t('settings.model.providerNamePlaceholder')}
                        value={customProviderName}
                        onChange={(e) => setCustomProviderName(e.target.value)}
                        className="w-full bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        {t('settings.model.baseUrl')}
                      </label>
                      <Input
                        placeholder={t('settings.model.baseUrlPlaceholder')}
                        value={customProviderUrl}
                        onChange={(e) => setCustomProviderUrl(e.target.value)}
                        className="w-full bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        {t('settings.model.modelName')}
                      </label>
                      <Input
                        placeholder={t('settings.model.modelNamePlaceholder')}
                        value={customModelName}
                        onChange={(e) => setCustomModelName(e.target.value)}
                        className="w-full bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <label className="text-xs font-semibold text-foreground">
                        {t('settings.model.supportsSTT')}
                      </label>
                      <button
                        onClick={() => setHasSTTSupport(!hasSTTSupport)}
                        className={`w-12 h-7 rounded-full transition-colors cursor-pointer ${hasSTTSupport ? 'bg-primary' : 'bg-muted'}`}
                        title={t('settings.model.supportsSTTHelp')}
                      >
                        <div className={`w-6 h-6 rounded-full bg-foreground transition-transform ${hasSTTSupport ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {hasSTTSupport && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            {t('settings.model.sttModelName')}
                          </label>
                          <Input
                            placeholder={t('settings.model.sttModelNamePlaceholder')}
                            value={customSTTModelName}
                            onChange={(e) => setCustomSTTModelName(e.target.value)}
                            className="w-full bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            {t('settings.model.sttApiUrl')}
                          </label>
                          <Input
                            placeholder={t('settings.model.sttApiUrlPlaceholder')}
                            value={customSTTUrl}
                            onChange={(e) => setCustomSTTUrl(e.target.value)}
                            className="w-full bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Model Selection */}
                {availableModels.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      {t('settings.model.model')}
                    </label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                        <span className="truncate text-left">
                          {availableModels.find(m => m.id === model)?.name ?? model}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="focus:bg-secondary/50">
                            <div className="flex flex-col">
                              <span>{m.name}</span>
                              {m.description && <span className="text-xs text-muted-foreground">{m.description}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* BioLLM API Endpoint */}
                {isBioLLM && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      {t('settings.model.apiEndpoint')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.model.apiEndpointPlaceholder')}
                      value={customProviderUrl}
                      onChange={(e) => setCustomProviderUrl(e.target.value)}
                      className="bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>
                )}

                {/* API Key */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.model.apiKey')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={t('settings.model.apiKeyPlaceholder', { provider: isCustomProvider ? customProviderName || t('settings.model.customProvider') : selectedProvider?.name || t('settings.model.apiKeyFallback') })}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="cursor-pointer h-9 w-9"
                    >
                      {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Lock className="inline h-3 w-3 mr-1" />
                    {t('settings.model.encryptionNotice')}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Tuning Section */}
          <AccordionItem value="tuning" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🧠 {t('settings.sections.tuning').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                {/* Memory Window */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.tuning.memoryWindow')}
                    <span className="ml-2 text-primary font-bold">{memoryWindowSize} {t('settings.tuning.memoryWindowUnit')}</span>
                  </label>
                  <input
                    type="range"
                    min={MIN_MEMORY_SIZE}
                    max={MAX_MEMORY_SIZE}
                    step={2}
                    value={memoryWindowSize}
                    onChange={(e) => setMemoryWindowSize(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>4</span>
                    <span>50</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.tuning.memoryWindowHelp')}
                  </p>
                </div>

                {/* Streaming Mode */}
                <div className="pt-3 border-t border-border/50 opacity-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('settings.tuning.streamingMode')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.tuning.streamingModeHelp')}
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-12 h-7 rounded-full bg-muted cursor-not-allowed"
                    >
                      <div className="w-6 h-6 bg-background rounded-full translate-x-0" />
                    </button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Voice Section */}
          <AccordionItem value="voice" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🗣️ {t('settings.sections.voice').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.voice.ttsProvider')}
                  </label>
                  <Select value={voiceProvider} onValueChange={setVoiceProvider}>
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id} className="focus:bg-secondary/50">
                          <span>{provider.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTTSProvider && selectedTTSProvider.models[0] && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedTTSProvider.models[0].description}
                    </p>
                  )}
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.voice.voice')}
                  </label>
                  <Select
                    value={selectedVoice || defaultVoice}
                    onValueChange={(val) => setSelectedVoice(val)}
                  >
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.length > 0 ? (
                        availableVoices.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id} className="focus:bg-secondary/50">
                            <span>{voice.name}</span>
                            {voice.isDefault && <span className="text-muted-foreground text-xs ml-2">({t('common.default')})</span>}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {t('settings.voice.noVoices')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t(
                      availableVoices.length === 1 ? 'settings.voice.voiceAvailable' : 'settings.voice.voicesAvailable',
                      {
                        count: availableVoices.length,
                        gender: avatarGender === 'F' ? t('settings.companion.female').toLowerCase() : t('settings.companion.male').toLowerCase(),
                      },
                    )}
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.voice.apiKey')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type={showVoiceApiKey ? 'text' : 'password'}
                      placeholder={shouldAutoPopulateVoiceKey ? t('settings.voice.globalKeyPlaceholder') : t('settings.voice.apiKeyPlaceholder', { provider: selectedTTSProvider?.name || t('settings.voice.apiKeyFallback') })}
                      value={displayVoiceApiKey}
                      onChange={(e) => {
                        if (!shouldAutoPopulateVoiceKey) {
                          setVoiceApiKey(e.target.value)
                        }
                      }}
                      disabled={shouldAutoPopulateVoiceKey}
                      className={`flex-1 bg-primary/20 border-primary/50 text-foreground placeholder:text-muted-foreground text-sm ${shouldAutoPopulateVoiceKey ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVoiceApiKey(!showVoiceApiKey)}
                      className="cursor-pointer h-9 w-9"
                    >
                      {showVoiceApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Lock className="inline h-3 w-3 mr-1" />
                    {shouldAutoPopulateVoiceKey ? t('settings.voice.globalKeyNotice') : t('settings.voice.encryptionNotice')}
                  </p>
                </div>

                {/* Voice Output Toggle */}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('settings.voice.voiceOutput')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('settings.voice.voiceOutputHelp')}
                      </p>
                    </div>
                    <button
                      onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
                      className={`w-12 h-7 rounded-full transition-colors cursor-pointer ${voiceOutputEnabled ? 'bg-accent' : 'bg-muted'
                        }`}
                    >
                      <div
                        className={`w-6 h-6 bg-background rounded-full transition-transform ${voiceOutputEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Privacy Section */}
          <AccordionItem value="privacy" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🔒 {t('settings.sections.privacy').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('settings.privacy.privacyMode')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {privacyMode
                        ? t('settings.privacy.enabledHelp')
                        : t('settings.privacy.disabledHelp')
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setPrivacyMode(!privacyMode)}
                    className={`w-12 h-7 rounded-full transition-colors cursor-pointer ${privacyMode ? 'bg-primary' : 'bg-destructive'
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-foreground transition-transform ${privacyMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
                {!privacyMode && (
                  <div className="p-2 rounded bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground">
                      {t('settings.privacy.infoBox')}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Language Section */}
          <AccordionItem value="language" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🌐 {t('settings.language').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    {t('settings.language')}
                  </label>
                  <Select
                    value={locale}
                    onValueChange={(value: Locale) => {
                      void setLocale(value)
                      toast({
                        title: t('settings.language'),
                        description: LOCALE_LABELS[value],
                      })
                    }}
                  >
                    <SelectTrigger className="w-full border-primary/50 bg-primary/20 text-foreground text-sm cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LOCALES.map((code) => (
                        <SelectItem key={code} value={code} className="focus:bg-secondary/50">
                          {LOCALE_LABELS[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('settings.languageDescription')}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Summary Section */}
          <AccordionItem value="summary" className="border-b border-border/50">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              🔮 {t('settings.sections.summary').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-3">
                {/* Companion Summary Card */}
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">{companionName}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.avatar')}:</span>
                      <span className="font-medium text-foreground capitalize">
                        {avatarCategory} {avatarGender === 'F' ? '♀' : '♂'} ({avatarColorScheme})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.personality')}:</span>
                      <span className="font-medium text-foreground">{personalityType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.visualFormat')}:</span>
                      <span className="font-medium text-foreground">
                        {visualFormat === 'static-2d' ? 'Static 2D' : visualFormat === 'animated-2d' ? 'Animated 2D' : 'Animated 3D'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.created')}:</span>
                      <span className="font-medium text-foreground">
                        {new Date().toLocaleDateString(locale === 'en' ? 'en-US' : locale)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Configuration */}
                <div className="pt-2 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-foreground mb-2">{t('settings.summary.aiConfiguration')}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.provider')}:</span>
                      <span className="font-medium text-foreground">{isCustomProvider ? customProviderName || t('common.custom') : selectedProvider?.name || t('common.none')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.model')}:</span>
                      <span className="font-medium text-foreground text-xs">{isCustomProvider ? customModelName || t('common.custom') : availableModels.find(m => m.id === model)?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.memory')}:</span>
                      <span className="font-medium text-foreground">{memoryWindowSize} {t('settings.summary.memoryUnit')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.privacyMode')}:</span>
                      <span className="font-medium text-foreground">{privacyMode ? t('common.enabled') : t('common.disabled')}</span>
                    </div>
                  </div>
                </div>

                {/* Voice Configuration */}
                <div className="pt-2 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-foreground mb-2">{t('settings.summary.voiceConfiguration')}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.ttsProvider')}:</span>
                      <span className="font-medium text-foreground">{selectedTTSProvider?.name || t('common.none')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('settings.summary.model')}:</span>
                      <span className="font-medium text-foreground">{selectedTTSProvider?.models[0]?.name || 'N/A'}</span>
                    </div>
                    {shouldAutoPopulateVoiceKey && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('settings.summary.apiKey')}:</span>
                        <span className="font-medium text-accent text-xs">{t('settings.summary.globalKey')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Traits Preview */}
                {personalityTraits && (
                  <div className="pt-2 border-t border-border/50">
                    <h4 className="text-xs font-semibold text-foreground mb-1">{t('settings.summary.traits')}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{personalityTraits}</p>
                  </div>
                )}

              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7. About Section */}
          <AccordionItem value="about" className="border-b-0">
            <AccordionTrigger className="hover:bg-secondary/20 px-2 py-2 rounded text-sm font-semibold cursor-pointer">
              ✨ {t('settings.sections.about').toUpperCase()}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t('settings.about.version')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.about.tagline')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('settings.about.copyright')}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer - Save Button */}
      <div className="border-t border-border p-4 bg-secondary/10 flex-shrink-0">
        <Button
          onClick={handleSaveSettings}
          className="w-full hover:bg-accent/80 text-foreground font-bold cursor-pointer"
        >
          💾 {t('settings.save').toUpperCase()}
        </Button>
      </div>
    </Card>
  )
}
