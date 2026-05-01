/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          deep: "#020203",
          base: "#050506",
          elevated: "#0a0a0c",
        },
        foreground: {
          DEFAULT: "#EDEDEF",
          muted: "#8A8F98",
          subtle: "rgba(255, 255, 255, 0.60)",
        },
        accent: {
          DEFAULT: "#5E6AD2", // Indigo Brand Color
          bright: "#717dd9",
          glow: "rgba(94, 106, 210, 0.4)",
        },
        emerald: {
          brand: "#10b981", // Emerald Brand Color
        },
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          hover: "rgba(255, 255, 255, 0.06)",
        },
        border: {
          default: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.15)",
          accent: "rgba(94, 106, 210, 0.40)",
        }
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 10px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 40px rgba(94, 106, 210, 0.15)',
        'accent-glow': '0 0 0 1px rgba(94, 106, 210, 0.6), 0 4px 20px rgba(94, 106, 210, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)',
        'emerald-glow': '0 0 0 1px rgba(16, 185, 129, 0.6), 0 4px 20px rgba(16, 185, 129, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)',
        'inner-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
      },
      animation: {
        'float': 'float 10s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}

