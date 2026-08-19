import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/weather')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ temp: 22, condition: "Sunny" }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
})
