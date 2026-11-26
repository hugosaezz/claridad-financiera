# Conexión Bancaria Real PSD2 (Enable Banking — Gratis para uso personal)

Esta Supabase Edge Function actúa como puente seguro entre **Claridad Financiera** y la API oficial PSD2 de **Enable Banking** (compatible con BBVA, Santander, CaixaBank, ING, Sabadell, Revolut, N26, Openbank, Bankinter, Imagin, Abanca, Unicaja, Kutxabank y +2.500 bancos europeos).

Tu clave privada RSA (`.pem`) vive únicamente en los secretos de Supabase y **nunca se expone en el navegador ni en GitHub**.

## Configuración en 3 minutos (0 €/mes)

1. Crea una cuenta personal gratuita en [enablebanking.com/cp](https://enablebanking.com/cp/).
2. Crea una aplicación (**Restricted / Personal**), añade tu URL de redirección (por ejemplo `https://hugosaezz.github.io/claridad-financiera/`) y descarga tu clave privada RSA (`private.pem`).
3. Si la clave descargada empieza por `BEGIN RSA PRIVATE KEY`, conviértela a PKCS#8 en un comando:
   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private.pem -out private_pkcs8.pem
   ```
4. Sube los secretos y despliega la función en tu proyecto de Supabase:
   ```bash
   supabase secrets set ENABLE_BANKING_APP_ID="TU_APP_ID"
   supabase secrets set ENABLE_BANKING_REDIRECT_URL="https://hugosaezz.github.io/claridad-financiera/"
   supabase secrets set ENABLE_BANKING_PRIVATE_KEY="$(cat private_pkcs8.pem)"
   supabase functions deploy open-banking --no-verify-jwt
   ```
5. Abre **Claridad Financiera → Yo → Bancos y Alertas → Conectar banco** y autoriza tu banco con PSD2 de solo lectura (válido 90 días, revocable en 1 toque).
