import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { divIcon, type LatLngTuple } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import 'leaflet/dist/leaflet.css'

export type MapLocation = {
  latitude: number
  longitude: number
}

const DEFAULT_CENTER: LatLngTuple = [45, 15]
const DEFAULT_ZOOM = 4
const LOCATION_ZOOM = 12

const pinIcon = divIcon({
  className: 'airport-map__pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function toTuple(location: MapLocation): LatLngTuple {
  return [location.latitude, location.longitude]
}

function BaseTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  )
}

function ClickHandler({ onPick }: { onPick: (location: MapLocation) => void }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      })
    },
  })

  return null
}

type LocationPickerProps = {
  value: MapLocation | null
  onChange: (location: MapLocation) => void
}

export function AirportLocationPicker({ value, onChange }: LocationPickerProps) {
  const { t } = useTranslation()

  return (
    <div className="airport-map">
      <MapContainer
        center={value ? toTuple(value) : DEFAULT_CENTER}
        zoom={value ? LOCATION_ZOOM : DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="airport-map__canvas"
        aria-label={t('admin.airports.map.pickerAria')}
      >
        <BaseTiles />
        <ClickHandler onPick={onChange} />
        {value ? <Marker position={toTuple(value)} icon={pinIcon} /> : null}
      </MapContainer>
      <p className="airport-map__hint">
        {value
          ? t('admin.airports.map.selected', {
              latitude: value.latitude.toFixed(5),
              longitude: value.longitude.toFixed(5),
            })
          : t('admin.airports.map.pickHint')}
      </p>
    </div>
  )
}

type LocationDialogProps = {
  title: string
  subtitle: string
  location: MapLocation
  onClose: () => void
}

export function AirportLocationDialog({ title, subtitle, location, onClose }: LocationDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    // Guarded because StrictMode runs this effect twice. No cleanup calls close(): removing the
    // element already dismisses it, and close() would fire a "close" event that triggers onClose.
    if (!dialog.open) {
      dialog.showModal()
    }
    // The map is mounted only once the dialog is visible so Leaflet measures the real size.
    setIsOpen(true)
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="airport-dialog"
      aria-labelledby="airport-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="airport-dialog__header">
        <div>
          <h3 id="airport-dialog-title">{title}</h3>
          <p>{subtitle}</p>
        </div>
        <button
          type="button"
          className="airport-dialog__close"
          onClick={onClose}
          aria-label={t('admin.airports.map.close')}
          title={t('admin.airports.map.close')}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {isOpen ? (
        <MapContainer
          center={toTuple(location)}
          zoom={LOCATION_ZOOM}
          scrollWheelZoom
          className="airport-map__canvas airport-map__canvas--dialog"
          aria-label={t('admin.airports.map.viewAria', { name: title })}
        >
          <BaseTiles />
          <Marker position={toTuple(location)} icon={pinIcon} />
        </MapContainer>
      ) : null}
    </dialog>
  )
}
