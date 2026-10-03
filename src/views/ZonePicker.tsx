import { ZONES, useSettings } from '../store'

/** "Times in America/Los_Angeles", with the zone as a picker. */
export function ZonePicker() {
  const [settings, setSettings] = useSettings()
  const zones = ZONES.includes(settings.zone) ? ZONES : [settings.zone, ...ZONES]
  return (
    <label className="zone-picker">
      <span>Times in</span>
      <select value={settings.zone} onChange={(e) => setSettings({ ...settings, zone: e.target.value })}>
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </label>
  )
}
