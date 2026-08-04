# 📞 Iris Inbound

**Iris Inbound** es un módulo de call center ligero y eficiente diseñado para integrarse nativamente con **VitalPBX** y **Sonata Dialer**. Su objetivo principal es unificar la gestión de campañas telefónicas, cubriendo tanto los flujos de llamadas entrantes (Inbound) como salientes (Outbound).

Este es un proyecto de código abierto desarrollado con fines académicos por estudiantes de la **Universidad de Managua (UdeM)**.

---

## 🚀 Tecnologías Principales

El proyecto está construido bajo una arquitectura full-stack moderna, utilizando un único repositorio para el frontend y el backend:

*   **Framework Fullstack:** Analog.js (impulsado por Vite)
*   **Lenguaje:** TypeScript estricto en ambos entornos.
*   **Frontend:** Angular v22, TailwindCSS v4, ng-icons.
*   **Backend:** Nitro (H3), Node.js.
*   **Base de Datos & ORM:** MySQL, Drizzle ORM.
*   **Autenticación:** JSON Web Tokens (JWT) & bcrypt.

---

## 📋 Requisitos Previos

Antes de levantar el entorno de desarrollo, asegúrate de cumplir con los siguientes requerimientos:

1.  **Node.js:** Versión >= 22.22.3 (estrictamente requerido).
2.  **Gestor de paquetes:** pnpm.
3.  **Infraestructura PBX:**
    *   Instancia / Máquina Virtual de **VitalPBX 4.5**.
    *   Módulo de **Sonata Dialer** instalado y configurado en el sistema.

---

## 🛠️ Instalación y Configuración Local

Sigue estos pasos para ejecutar el proyecto en tu máquina local:

1. Instalar dependencias
En la raíz del proyecto, ejecuta el gestor de paquetes para descargar los módulos de Node:
pnpm install

2. Sembrar la base de datos (Opcional pero recomendado)
Para generar datos de prueba y tener un usuario administrador inicial, ejecuta el script de seeding (puedes revisar los datos generados y las credenciales en src/server/db/seed.ts):
pnpm db:seed

3. Levantar el servidor de desarrollo
Inicia el servidor de desarrollo de Vite/Analog:
pnpm run dev

---

## 💻 Uso Básico

Una vez que el servidor esté corriendo:

1.  Abre tu navegador web y navega a http://localhost:5173.
2.  Inicia sesión utilizando las credenciales generadas en el paso de seeding.
3.  Desde el dashboard se podrá unir a campañas salientes o entrantes, las salientes gestionadas por Sonata Dialer y las entrantes por esta app.

---

## 🎓 Créditos

Creado y mantenido por estudiantes de la **Universidad de Managua (UdeM)**.  
Distribuido como software de código abierto para contribuir a la comunidad de desarrolladores y telecomunicaciones.