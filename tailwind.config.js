/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F6F6F3',
          subtle: '#EFEFEA',
          muted: '#E5E5DF',
          pure: '#FFFFFF',
        },
        ink: {
          primary: '#171717',
          secondary: '#6B6B66',
          muted: '#8E8E89',
          faint: '#B0B0AA',
        },
        border: {
          subtle: '#E3E3DE',
          DEFAULT: '#E3E3DE',
          strong: '#C8C8C2',
        },
        accent: {
          DEFAULT: '#1B64DA', // Muted electric blue for communications
          hover: '#1451B3',
          subtle: '#EBF2FC',
          border: '#BED7FA',
        },
        ops: {
          live: '#16A34A',
          liveBg: '#F0FDF4',
          liveBorder: '#BBF7D0',

          warning: '#C25E00',
          warningBg: '#FFF7ED',
          warningBorder: '#FED7AA',

          critical: '#C92A2A',
          criticalBg: '#FEF2F2',
          criticalBorder: '#FECACA',

          standby: '#6B6B66',
          standbyBg: '#EFEFEA',
        }
      },
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'IBM Plex Mono',
          'JetBrains Mono',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'Menlo',
          'monospace'
        ],
      },
      borderRadius: {
        'none': '0',
        'xs': '2px',
        'sm': '3px',
        DEFAULT: '4px',
        'md': '4px',
        'lg': '6px',
      },
      boxShadow: {
        'none': 'none',
        'hairline': '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
      },
      fontSize: {
        '2xs': ['10px', '13px'],
        'xs': ['11px', '15px'],
        'sm': ['12px', '16px'],
        'base': ['13px', '18px'],
        'md': ['14px', '20px'],
        'lg': ['16px', '22px'],
      }
    },
  },
  plugins: [],
}
