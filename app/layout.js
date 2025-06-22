export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Dokploy Dashboard Pro</title>
        <meta name="description" content="Modern Docker container management dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}