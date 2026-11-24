import { defineConfig } from 'vitest/config'

// Aparte de vite.config.ts para no cargar los plugins de React y Tailwind: las pruebas son de
// lógica pura (sin componentes ni lienzo, ver docs/Decisiones.md) y corren en node.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
