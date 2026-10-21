import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

const LANGUAGE_STORAGE_KEY = 'sfc-language'

function normalizeSupportedLanguage(value: string | null): 'en' | 'sr' | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.toLowerCase()
  if (normalized.startsWith('sr')) {
    return 'sr'
  }

  if (normalized.startsWith('en')) {
    return 'en'
  }

  return undefined
}

function getInitialLanguage(): 'en' | 'sr' | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return normalizeSupportedLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
}

const resources = {
  en: {
    translation: {
      common: {
        themeDark: 'Dark mode',
        themeLight: 'Light mode',
        switchToDark: 'Switch to dark theme',
        switchToLight: 'Switch to light theme',
        languageLabel: 'Language',
        english: 'ENG',
        serbian: 'SRB',
      },
      login: {
        title: 'Sign in to SmartFlightCompanion',
        subtitle: 'Track flights, gate changes, and trip updates in one place.',
        username: 'Username',
        usernamePlaceholder: 'Enter your username',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        submit: 'Sign in',
        submitting: 'Signing in...',
        registerPrompt: 'New here?',
        registerAction: 'Create your account',
        success: 'Welcome back, {{name}}.',
        failure: 'Unable to sign in. Please check your credentials.',
      },
      register: {
        title: 'Create your SmartFlightCompanion account',
        subtitle: 'Register once to receive flight updates and manage your travel profile.',
        firstName: 'First name',
        firstNamePlaceholder: 'Enter your first name',
        lastName: 'Last name',
        lastNamePlaceholder: 'Enter your last name',
        username: 'Username',
        usernamePlaceholder: 'Choose a username',
        email: 'Email',
        emailPlaceholder: 'Enter your email',
        password: 'Password',
        passwordPlaceholder: 'Create a password',
        confirmPassword: 'Confirm password',
        confirmPasswordPlaceholder: 'Repeat your password',
        submit: 'Create account',
        submitting: 'Creating account...',
        loginPrompt: 'Already have an account?',
        loginAction: 'Sign in',
        mismatch: 'Passwords do not match.',
        success: 'Account created for {{name}}. You can now sign in.',
        failure: 'Unable to create account. Please verify your details and try again.',
      },
      flights: {
        sectionAria: 'Upcoming flights',
        heading: 'Upcoming flights',
        loading: 'Loading upcoming departures...',
        loadError: 'Could not load flights right now.',
        empty: 'No future flights are available right now.',
        routeSeparator: 'to',
      },
      page: {
        loginSectionAria: 'Login section',
        loginFormAria: 'Login form',
        registerSectionAria: 'Registration section',
        registerFormAria: 'Registration form',
      },
    },
  },
  sr: {
    translation: {
      common: {
        themeDark: 'Tamni rezim',
        themeLight: 'Svetli rezim',
        switchToDark: 'Prebaci na tamnu temu',
        switchToLight: 'Prebaci na svetlu temu',
        languageLabel: 'Jezik',
        english: 'ENG',
        serbian: 'SRB',
      },
      login: {
        title: 'Prijavite se na SmartFlightCompanion',
        subtitle: 'Pratite letove, promene izlaza i novosti putovanja na jednom mestu.',
        username: 'Korisnicko ime',
        usernamePlaceholder: 'Unesite korisnicko ime',
        password: 'Lozinka',
        passwordPlaceholder: 'Unesite lozinku',
        submit: 'Prijava',
        submitting: 'Prijava u toku...',
        registerPrompt: 'Novi korisnik?',
        registerAction: 'Napravite nalog',
        success: 'Dobrodosli nazad, {{name}}.',
        failure: 'Prijava nije uspela. Proverite kredencijale.',
      },
      register: {
        title: 'Napravite SmartFlightCompanion nalog',
        subtitle: 'Registrujte se jednom za obavestenja o letovima i upravljanje profilom.',
        firstName: 'Ime',
        firstNamePlaceholder: 'Unesite ime',
        lastName: 'Prezime',
        lastNamePlaceholder: 'Unesite prezime',
        username: 'Korisnicko ime',
        usernamePlaceholder: 'Izaberite korisnicko ime',
        email: 'Email',
        emailPlaceholder: 'Unesite email',
        password: 'Lozinka',
        passwordPlaceholder: 'Kreirajte lozinku',
        confirmPassword: 'Potvrdite lozinku',
        confirmPasswordPlaceholder: 'Ponovite lozinku',
        submit: 'Kreiraj nalog',
        submitting: 'Kreiranje naloga...',
        loginPrompt: 'Vec imate nalog?',
        loginAction: 'Prijavite se',
        mismatch: 'Lozinke se ne podudaraju.',
        success: 'Nalog je kreiran za korisnika {{name}}. Sada mozete da se prijavite.',
        failure: 'Kreiranje naloga nije uspelo. Proverite podatke i pokusajte ponovo.',
      },
      flights: {
        sectionAria: 'Predstojeci letovi',
        heading: 'Predstojeci letovi',
        loading: 'Ucitavanje predstojecih polazaka...',
        loadError: 'Trenutno nije moguce ucitati letove.',
        empty: 'Trenutno nema buducih letova.',
        routeSeparator: 'ka',
      },
      page: {
        loginSectionAria: 'Sekcija za prijavu',
        loginFormAria: 'Forma za prijavu',
        registerSectionAria: 'Sekcija za registraciju',
        registerFormAria: 'Forma za registraciju',
      },
    },
  },
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'sr'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  })

export default i18n
