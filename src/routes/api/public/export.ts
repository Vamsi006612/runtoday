import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/export')({
  server: {
    handlers: {
      GET: async () => {
        // Mock export for now
        return new Response(JSON.stringify({ message: "Export functionality placeholder" }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
})
