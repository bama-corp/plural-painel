import 'dotenv/config'
import app from './app.js'

if (process.env.NODE_ENV === 'production') {
  const jwt = process.env.JWT_SECRET
  if (!jwt || jwt.length < 16 || jwt === 'change-me-in-production') {
    console.error(
      '[FATAL] Defina JWT_SECRET (string longa e aleatória) no ambiente de produção. Não use o valor predefinido.'
    )
    process.exit(1)
  }
}

const PORT = process.env.PORT || 3001

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Rove+ API em http://localhost:${PORT}`)
  })
}

export default app
