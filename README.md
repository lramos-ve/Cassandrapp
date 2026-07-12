# Cassadrapp 👶

Cassadrapp es una aplicación web interactiva y en tiempo real diseñada para ayudar a los futuros padres a organizar y prepararse para la llegada de su bebé.

## 🌟 Características Principales

*   **Tablero Kanban:** Gestiona tus tareas (Comprar cuna, Agendar pediatra) con vista adaptativa (centrado en escritorio, deslizable en móvil). Permite arrastrar y soltar, asignar prioridades, etiquetas y responsables.
*   **Editor de Notas:** Espacio de texto enriquecido para diarios y listas. ¡Las listas de tareas incluyen casillas interactivas y se pueden reordenar arrastrándolas!
*   **Contador de Contracciones:** Herramienta integrada para registrar la frecuencia y duración. ¡Incluye un botón para compartir fácilmente las sesiones (ej. por WhatsApp) en tiempo real!
*   **Sincronización en Tiempo Real:** Cambios en el tablero o notas se sincronizan al instante en todos los dispositivos conectados vía **Socket.IO**.
*   **Almacenamiento Local:** Los datos se guardan de forma persistente utilizando una base de datos local SQLite.

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** React 19, Vite, Tailwind CSS (Lucide React para iconos), `@hello-pangea/dnd` para Drag & Drop, Tiptap para el editor de texto.
*   **Backend:** Node.js, Express, Socket.IO.
*   **Base de Datos:** SQLite (`better-sqlite3`).

## 🚀 Cómo ejecutar el proyecto

Sigue estos pasos para correr el proyecto en tu entorno local:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo:**
   Ejecuta el siguiente comando para iniciar simultáneamente el frontend (Vite) y el backend (Node.js):
   ```bash
   npm run dev
   ```

   - El frontend estará disponible usualmente en `http://localhost:5173`.
   - El backend y los WebSockets correrán en el puerto `3001`.

3. **Construir para producción:**
   ```bash
   npm run build
   ```

## 📦 Estructura del Proyecto

*   `src/`: Contiene todo el código del Frontend en React (Componentes, App principal).
*   `server.js`: Archivo principal del servidor Backend (Express + Socket.IO + SQLite).
*   `database.sqlite`: Base de datos SQLite (se genera automáticamente).

---
*Un espacio especial para preparar la llegada del nuevo integrante de la familia.* ❤️
