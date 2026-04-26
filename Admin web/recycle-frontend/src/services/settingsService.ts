import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "../firebase"

const SETTINGS_DOC = "system_settings"

export interface SystemSettings {
  organization?: {
    name: string
    contactEmail: string
    address: string
  }
  regional?: {
    timezone: string
    language: string
  }
  notifications?: {
    email: boolean
    sms: boolean
    push: boolean
  }
  security?: {
    twoFA: boolean
    minPasswordLength: number
  }
  system?: {
    autoApproval: boolean
    routeOptimization: boolean
    realTimeTracking: boolean
    apiKey: string
  }
  data?: {
    retentionDays: number
  }
}

const DEFAULTS: SystemSettings = {
  organization: {
    name: "Eco Track Solutions",
    contactEmail: "admin@ecotrack.com",
    address: "123 Green Street, Eco City, EC 12345",
  },
  regional: {
    timezone: "Asia/Colombo",
    language: "en",
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
  security: {
    twoFA: false,
    minPasswordLength: 8,
  },
  system: {
    autoApproval: false,
    routeOptimization: true,
    realTimeTracking: true,
    apiKey: "",
  },
  data: {
    retentionDays: 90,
  },
}

export async function loadSettings(): Promise<SystemSettings> {
  const snap = await getDoc(doc(db, SETTINGS_DOC, "config"))
  if (!snap.exists()) return { ...DEFAULTS }
  const data = (snap.data() || {}) as Record<string, any>
  return {
    organization: { ...DEFAULTS.organization, ...(data.organization || {}) },
    regional: { ...DEFAULTS.regional, ...(data.regional || {}) },
    notifications: { ...DEFAULTS.notifications, ...(data.notifications || {}) },
    security: { ...DEFAULTS.security, ...(data.security || {}) },
    system: { ...DEFAULTS.system, ...(data.system || {}) },
    data: { ...DEFAULTS.data, ...(data.data || {}) },
  }
}

export async function saveSettings(partial: Partial<SystemSettings>): Promise<void> {
  const ref = doc(db, SETTINGS_DOC, "config")
  const current = await loadSettings()
  const merged = {
    ...current,
    ...partial,
    organization: { ...current.organization, ...partial.organization },
    regional: { ...current.regional, ...partial.regional },
    notifications: { ...current.notifications, ...partial.notifications },
    security: { ...current.security, ...partial.security },
    system: { ...current.system, ...partial.system },
    data: { ...current.data, ...partial.data },
  }
  await setDoc(ref, merged, { merge: true })
}
