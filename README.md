# NGN-Copiloto · NOC

Agente de IA (Google Gemini) que **diseña y valida servicios de borde** de una red de nueva generación (NGN): túneles GRE/IPsec, MPLS L3VPN, QoS DiffServ, HSRP y PPPoE, con cálculo de MTU/MSS paso a paso.

> El agente **propone y valida; la persona decide**. Toda configuración sale como **BORRADOR** y ningún cambio se aplica sin aprobación humana.

Proyecto del **Diplomado Arquitectura Agéntica · CUN**.

---

## Qué hace

- Recibe una solicitud de diseño (por ejemplo, *"túnel GRE/IPsec entre Medellín y Bogotá sobre MPLS"*).
- Responde con un formato fijo de 6 secciones: resumen, supuestos, cálculos, **borrador CLI**, validaciones (✔ ✖ ⚠) y control humano con nivel de riesgo.
- **No inventa datos**: si faltan IPs, VLAN o interfaces, las pregunta.
- **Se detiene y escala** ante valores imposibles, intentos de desactivar la seguridad o pedidos de aplicar cambios en producción.

## Interfaz (consola NOC)

- Mapa de topología animado (Bogotá, Medellín, Cali GPON, NOC Ibagué y núcleo MPLS).
- Consola de chat con bloques CLI copiables.
- Medidor de riesgo (Bajo / Medio / Alto).
- Panel de **aprobación humana** (Aprobar / Solicitar cambios / Rechazar) con bitácora exportable a CSV.
- Escenarios de prueba con un clic.

## Guardrails

| Regla | Comportamiento |
|---|---|
| Borradores obligatorios | Todo bloque CLI lleva `! BORRADOR - NO APLICAR SIN APROBACIÓN` |
| Sin claves reales | Usa marcadores como `<CLAVE_PSK>` |
| Sin cambios en producción | Escala al administrador con riesgo Alto |
| Sin datos inventados | Pregunta lo que falta (máximo 2 veces) |
| Parada ante valores imposibles | Ej.: MTU 1600 en PPPoE → `⛔ Solicitud detenida y escalada` |
| Resistencia a inyección | Ignora pedidos de saltarse las reglas |

---

## Cómo ejecutarlo en tu computador

### Requisitos
- [Node.js](https://nodejs.org) 22 o superior
- Una clave gratuita de la API de Gemini: https://aistudio.google.com/apikey

### Pasos

```bash
# 1. Descargar el proyecto
git clone https://github.com/maurorodriguezgarcia/ngn-copiloto-noc.git
cd ngn-copiloto-noc

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de configuración
cp .env.example .env        # En Windows: copy .env.example .env
```

Abre el archivo `.env` y reemplaza el valor de `NGN_GEMINI_KEY` por tu clave:

```
NGN_GEMINI_KEY="tu_clave_aqui"
```

```bash
# 4. Iniciar la aplicación
npm run dev
```

Abre **http://localhost:3000** en el navegador.

> 🔒 El archivo `.env` está en `.gitignore`: tu clave **no** se sube a GitHub. La clave solo se usa en el servidor (`/api/chat`) y nunca llega al navegador.

### Modo producción (opcional)

```bash
npm run build
NODE_ENV=production npx tsx server.ts
```

---

## Publicarlo en la web (opcional)

Puedes desplegarlo gratis en servicios como **Render** (Web Service):

| Campo | Valor |
|---|---|
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npx tsx server.ts` |
| Variables de entorno | `NODE_ENV=production` y `NGN_GEMINI_KEY=<tu clave>` |

> Si lo publicas con tu clave, los visitantes consumirán tu cuota de Gemini. Configura límites de uso en tu proyecto de Google.

---

## Evidencias de pruebas

Las instrucciones completas del agente y las respuestas reales de la IA en las 8 pruebas
(caso normal, cálculo, datos incompletos, valor imposible, inyección de prompt,
cambio en producción, seguridad y fuera de alcance) están en
[PRUEBAS_NGN_Copiloto.txt](PRUEBAS_NGN_Copiloto.txt).

---

## Estructura

```
server.ts                 Servidor Express + endpoint seguro /api/chat
src/agentInstructions.ts  Instrucciones del sistema del agente (rol, BANG, guardrails, HITL)
src/                      Interfaz React (topología, chat, panel HITL)
.env.example              Plantilla de variables de entorno
```

## Tecnologías

React · TypeScript · Tailwind CSS · Vite · Express · Google Gemini (`@google/genai`) · Google AI Studio Build
