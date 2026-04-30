import { MapPin } from 'lucide-react'
import type { SiteSummary } from '../types'

interface Props {
  sites: SiteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// SVG coordinates for Indian cities (simplified map projection)
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  'mumbai':     { x: 190, y: 390 },
  'pune':       { x: 205, y: 400 },
  'delhi':      { x: 240, y: 200 },
  'new delhi':  { x: 240, y: 200 },
  'bangalore':  { x: 225, y: 470 },
  'bengaluru':  { x: 225, y: 470 },
  'chennai':    { x: 260, y: 465 },
  'hyderabad':  { x: 240, y: 410 },
  'kolkata':    { x: 340, y: 300 },
  'ahmedabad':  { x: 185, y: 300 },
  'jaipur':     { x: 215, y: 240 },
  'lucknow':    { x: 275, y: 240 },
  'chandigarh': { x: 235, y: 170 },
  'kochi':      { x: 210, y: 510 },
  'bhopal':     { x: 235, y: 315 },
  'patna':      { x: 315, y: 260 },
  'goa':        { x: 195, y: 430 },
  'indore':     { x: 215, y: 310 },
  'nagpur':     { x: 255, y: 340 },
  'visakhapatnam': { x: 290, y: 410 },
  'thiruvananthapuram': { x: 215, y: 530 },
  'coimbatore': { x: 230, y: 490 },
  'surat':      { x: 185, y: 330 },
  'vadodara':   { x: 190, y: 310 },
}

function getSiteCoords(siteName: string): { x: number; y: number } | null {
  const lower = siteName.toLowerCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(city)) return coords
  }
  // Fallback: hash name to a position on the map
  const hash = Array.from(siteName).reduce((a, c) => a + c.charCodeAt(0), 0)
  return { x: 180 + (hash % 180), y: 180 + (hash % 350) }
}

const riskColor = (level: string) => {
  switch (level) {
    case 'CRITICAL': return '#f87171'
    case 'ELEVATED': return '#facc15'
    case 'LOW':
    default: return '#34d399'
  }
}

export function SiteMap({ sites, selectedId, onSelect }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
        <MapPin size={14} className="text-accent" />
        <h3 className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">Site Distribution Map</h3>
      </div>

      <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-white/[0.01] to-transparent p-4">
        <svg viewBox="0 0 500 600" className="w-full h-full">
          {/* Simplified India outline */}
          <path
            d="M230,80 L270,90 L310,100 L350,130 L370,170 L380,220 L370,260 L350,280 L340,320 L320,350 L310,380 L290,400 L280,430 L270,460 L260,490 L240,520 L220,540 L200,530 L210,500 L200,480 L190,460 L180,430 L170,400 L180,370 L190,340 L180,310 L170,280 L160,250 L170,220 L180,190 L200,160 L210,130 L220,100 Z"
            fill="rgba(255,255,255,0.02)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />

          {/* Grid lines */}
          {[150, 200, 250, 300, 350, 400, 450, 500].map(y => (
            <line key={`h${y}`} x1="100" y1={y} x2="420" y2={y} stroke="rgba(255,255,255,0.02)" strokeDasharray="4 8" />
          ))}
          {[150, 200, 250, 300, 350, 400].map(x => (
            <line key={`v${x}`} x1={x} y1="80" x2={x} y2="560" stroke="rgba(255,255,255,0.02)" strokeDasharray="4 8" />
          ))}

          {/* Site pins */}
          {sites.map(site => {
            const coords = getSiteCoords(site.site_name)
            if (!coords) return null
            const color = riskColor(site.risk_level)
            const isSelected = site.site_id === selectedId

            return (
              <g
                key={site.site_id}
                className="cursor-pointer"
                onClick={() => onSelect(site.site_id)}
              >
                {/* Pulse ring */}
                <circle
                  cx={coords.x} cy={coords.y} r={isSelected ? 18 : 12}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity={0.3}
                  className={isSelected ? 'animate-ping' : ''}
                />
                {/* Glow */}
                <circle
                  cx={coords.x} cy={coords.y} r={8}
                  fill={color}
                  opacity={0.15}
                  filter="blur(4px)"
                />
                {/* Pin dot */}
                <circle
                  cx={coords.x} cy={coords.y} r={isSelected ? 6 : 4}
                  fill={color}
                  stroke={isSelected ? 'white' : 'none'}
                  strokeWidth={2}
                  className="transition-all duration-300"
                />
                {/* Label */}
                <text
                  x={coords.x + 10}
                  y={coords.y + 4}
                  fill="rgba(255,255,255,0.6)"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {site.site_id}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex items-center gap-4 text-[10px] text-foreground-muted font-mono uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Critical
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Elevated
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Low
          </div>
        </div>
      </div>
    </div>
  )
}
