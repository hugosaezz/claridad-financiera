# Claridad Financiera — Control Mensual & Deudas P2P

Aplicación fintech unificada con el sistema de diseño **Claridad Financiera (Google Stitch)** que integra:

1. **Control Mensual Personal (Mi Bolsillo)**:
   - *Safe-to-Spend* («Puedes gastar este mes»), ingresos y nómina automática, presupuestos por categoría con arrastre (`↻ Rollover`), suscripciones recurrentes, objetivos de ahorro, modo viaje, devoluciones pendientes, dictado por voz, Score Financiero (0–100), simulador *«¿Me lo puedo permitir?»* y asesor financiero inteligente.
2. **Apartado Independiente de Deudas y Grupos (Supabase Cloud + P2P)**:
   - Gestión de cobros (**Me deben**), pagos pendientes (**Debo**), grupos compartidos en tiempo real sobre **Supabase** (`General`, `Deudas`, `Fantasy` y grupos personalizados), reparto selectivo de cargos, notificaciones de pago con aprobación, recordatorios por Bizum/WhatsApp y calculadora Tricount (*Quién debe a quién*).
3. **Multi-Usuario con Registro Propio en Base de Datos**:
   - Cada usuario que inicia sesión o crea una cuenta tiene su propio registro aislado sincronizado con Supabase.
4. **Atajo Automático de Apple Pay (App `.IPA` y Web)**:
   - Compatible tanto con esquema nativo iOS (`claridad://pay?add=IMPORTE&desc=COMERCIO&user=ID`) como con URL Web (`https://hugosaezz.github.io/claridad-financiera/?add=IMPORTE&desc=COMERCIO&user=ID`).
5. **Instalación en iPhone (`.IPA` & Web App)**:
   - **Web App**: [https://hugosaezz.github.io/claridad-financiera/](https://hugosaezz.github.io/claridad-financiera/)
   - **Paquete iOS `.IPA` (AltStore / SideStore / Sideloadly / TrollStore)**: [Descargar `ClaridadFinanciera.ipa`](https://github.com/hugosaezz/claridad-financiera/releases/latest/download/ClaridadFinanciera.ipa)
