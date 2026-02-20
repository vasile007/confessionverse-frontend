/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: "var(--bg)",
                card: "var(--card)",
                muted: "var(--muted)",
                text: "var(--text)",
                primary: "var(--primary)",
                primary2: "var(--primary-2)",
            },
            borderRadius: {
                DEFAULT: "var(--radius)",
            },
            keyframes: {
                moveGrid: {
                    "0%": { "background-position": "0 0, 0 0" },
                    "100%": { "background-position": "400px 400px, 400px 400px" },
                },
            },
            animation: {
                moveGrid: "moveGrid 20s linear infinite",
            },
        },
    },
    plugins: [],
};



