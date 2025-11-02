import React from 'react';

// Map of country codes to flag emojis
const FLAG_MAP: { [key: string]: string } = {
  // Common countries
  'US': '🇺🇸',
  'GB': '🇬🇧',
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'NL': '🇳🇱',
  'SE': '🇸🇪',
  'NO': '🇳🇴',
  'DK': '🇩🇰',
  'FI': '🇫🇮',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'CN': '🇨🇳',
  'IN': '🇮🇳',
  'BR': '🇧🇷',
  'MX': '🇲🇽',
  'AR': '🇦🇷',
  'CL': '🇨🇱',
  'NZ': '🇳🇿',
  'ZA': '🇿🇦',
  'PL': '🇵🇱',
  'CZ': '🇨🇿',
  'AT': '🇦🇹',
  'CH': '🇨🇭',
  'BE': '🇧🇪',
  'PT': '🇵🇹',
  'GR': '🇬🇷',
  'TR': '🇹🇷',
  'RU': '🇷🇺',
  'UA': '🇺🇦',
  'IE': '🇮🇪',
  'SG': '🇸🇬',
  'HK': '🇭🇰',
  'TH': '🇹🇭',
  'VN': '🇻🇳',
  'PH': '🇵🇭',
  'ID': '🇮🇩',
  'MY': '🇲🇾',
  'IL': '🇮🇱',
  'AE': '🇦🇪',
  'SA': '🇸🇦',
  'EG': '🇪🇬',
  'NG': '🇳🇬',
  'KE': '🇰🇪',
  'IS': '🇮🇸',
  'LU': '🇱🇺',
  'RO': '🇷🇴',
  'BG': '🇧🇬',
  'HR': '🇭🇷',
  'SK': '🇸🇰',
  'SI': '🇸🇮',
  'HU': '🇭🇺',
  'LT': '🇱🇹',
  'LV': '🇱🇻',
  'EE': '🇪🇪',
};

// SVG-based flag renderer as fallback
const FLAG_SVG: { [key: string]: JSX.Element } = {
  'US': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="20" height="15" fill="#B22234"/>
      <rect y="1.15" width="20" height="1.15" fill="white"/>
      <rect y="3.46" width="20" height="1.15" fill="white"/>
      <rect y="5.77" width="20" height="1.15" fill="white"/>
      <rect y="8.08" width="20" height="1.15" fill="white"/>
      <rect y="10.38" width="20" height="1.15" fill="white"/>
      <rect y="12.69" width="20" height="1.15" fill="white"/>
      <rect width="8" height="6.92" fill="#3C3B6E"/>
    </svg>
  ),
  'GB': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="20" height="15" fill="#012169"/>
      <path d="M0 0L20 15M20 0L0 15" stroke="white" strokeWidth="3"/>
      <path d="M0 0L20 15M20 0L0 15" stroke="#C8102E" strokeWidth="2"/>
      <path d="M10 0V15M0 7.5H20" stroke="white" strokeWidth="5"/>
      <path d="M10 0V15M0 7.5H20" stroke="#C8102E" strokeWidth="3"/>
    </svg>
  ),
  'CA': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="5" height="15" fill="#D52B1E"/>
      <rect x="15" width="5" height="15" fill="#D52B1E"/>
      <rect x="5" width="10" height="15" fill="white"/>
      <path d="M10 4L11 6L13 6L11.5 7.5L12 9.5L10 8L8 9.5L8.5 7.5L7 6L9 6L10 4Z" fill="#D52B1E"/>
    </svg>
  ),
  'VN': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="20" height="15" fill="#DA251D"/>
      <path d="M10 3L11.545 7.091H15.878L12.167 9.818L13.711 13.909L10 11.182L6.289 13.909L7.833 9.818L4.122 7.091H8.455L10 3Z" fill="#FFFF00"/>
    </svg>
  ),
  'DE': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="20" height="5" fill="#000"/>
      <rect y="5" width="20" height="5" fill="#D00"/>
      <rect y="10" width="20" height="5" fill="#FFCE00"/>
    </svg>
  ),
  'FR': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="6.67" height="15" fill="#002395"/>
      <rect x="6.67" width="6.67" height="15" fill="white"/>
      <rect x="13.33" width="6.67" height="15" fill="#ED2939"/>
    </svg>
  ),
  'AU': (
    <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <rect width="20" height="15" fill="#012169"/>
      <path d="M0 0L10 7.5M10 0L0 7.5" stroke="white" strokeWidth="1.5"/>
      <path d="M0 0L10 7.5M10 0L0 7.5" stroke="#C8102E" strokeWidth="1"/>
      <path d="M5 0V7.5M0 3.75H10" stroke="white" strokeWidth="2.5"/>
      <path d="M5 0V7.5M0 3.75H10" stroke="#C8102E" strokeWidth="1.5"/>
    </svg>
  ),
};

interface FlagEmojiProps {
  countryCode?: string;
  size?: number;
}

export function FlagEmoji({ countryCode, size = 20 }: FlagEmojiProps) {
  if (!countryCode) {
    return <span style={{ fontSize: size }}>🌐</span>;
  }

  const upperCode = countryCode.toUpperCase();
  
  // If it's already an emoji (detected by length > 2), render it directly
  if (countryCode.length > 2) {
    return <span style={{ fontSize: size }}>{countryCode}</span>;
  }

  // Try to use SVG flag first for better compatibility
  if (FLAG_SVG[upperCode]) {
    return <span style={{ display: 'inline-block', width: size, height: size * 0.75 }}>{FLAG_SVG[upperCode]}</span>;
  }

  // Fall back to emoji
  const emoji = FLAG_MAP[upperCode];
  if (emoji) {
    return <span style={{ fontSize: size }}>{emoji}</span>;
  }

  // Default globe emoji
  return <span style={{ fontSize: size }}>🌐</span>;
}

// Export the country codes for use in the settings UI
export const COUNTRY_CODES = Object.keys(FLAG_MAP).sort();

export const COUNTRY_NAMES: { [key: string]: string } = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'JP': 'Japan',
  'KR': 'South Korea',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'NZ': 'New Zealand',
  'ZA': 'South Africa',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'BE': 'Belgium',
  'PT': 'Portugal',
  'GR': 'Greece',
  'TR': 'Turkey',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'IE': 'Ireland',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'MY': 'Malaysia',
  'IL': 'Israel',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'IS': 'Iceland',
  'LU': 'Luxembourg',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'HU': 'Hungary',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
};
