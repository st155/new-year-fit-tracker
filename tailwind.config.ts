import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        metric: {
          "body-fat": "hsl(var(--metric-body-fat))",
          weight: "hsl(var(--metric-weight))",
          vo2max: "hsl(var(--metric-vo2max))",
          row: "hsl(var(--metric-row))",
          recovery: "hsl(var(--metric-recovery))",
          steps: "hsl(var(--metric-steps))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-gold': 'var(--gradient-gold)',
        'gradient-card': 'var(--gradient-card)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'glow-secondary': 'var(--shadow-glow-secondary)',
        'glow-success': 'var(--shadow-glow-success)',
        'glow-gold': 'var(--shadow-glow-gold)',
        'glow-silver': 'var(--shadow-glow-silver)',
        'glow-bronze': 'var(--shadow-glow-bronze)',
        'card': 'var(--shadow-card)',
      },
      colors: {
        gold: "hsl(var(--gold))",
        silver: "hsl(var(--silver))",
        bronze: "hsl(var(--bronze))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
            opacity: "0"
          },
          to: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1"
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1"
          },
          to: {
            height: "0",
            opacity: "0"
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "fade-out": {
          "0%": {
            opacity: "1",
            transform: "translateY(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateY(10px)"
          }
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.3)"
          },
          "50%": {
            boxShadow: "0 0 40px hsl(var(--primary) / 0.6)"
          }
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" }
        },
        "bounce-in": {
          "0%": {
            transform: "scale(0.3)",
            opacity: "0"
          },
          "50%": {
            transform: "scale(1.05)"
          },
          "70%": {
            transform: "scale(0.9)"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" }
        },
        "heartbeat": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.1)" },
          "50%": { transform: "scale(1)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "swing": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(15deg)" },
          "40%": { transform: "rotate(-10deg)" },
          "60%": { transform: "rotate(5deg)" },
          "80%": { transform: "rotate(-5deg)" }
        },
        "ripple": {
          "0%": {
            width: "0",
            height: "0",
            opacity: "0.5"
          },
          "100%": {
            width: "500px",
            height: "500px",
            opacity: "0"
          }
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-1000px 0"
          },
          "100%": {
            backgroundPosition: "1000px 0"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "enter": "fade-in 0.3s ease-out",
        "exit": "fade-out 0.3s ease-out",
        "wiggle": "wiggle 0.5s ease-in-out",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "shake": "shake 0.3s ease-in-out",
        "heartbeat": "heartbeat 1s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "swing": "swing 1s ease-in-out",
        "ripple": "ripple 0.6s ease-out",
        "shimmer": "shimmer 2s linear infinite"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
