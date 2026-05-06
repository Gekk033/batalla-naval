# ⚓ Batalla Naval

Un juego de Batalla Naval completo hecho con HTML, CSS y JavaScript puro — sin dependencias externas.

## 🎮 Características

- **Colocación interactiva** de barcos con rotación (H/V) y vista previa
- **Colocación aleatoria** con un clic
- **5 barcos**: Portaaviones (5), Acorazado (4), Crucero (3), Submarino (3), Destructor (2)
- **IA inteligente** con estrategia de tablero ajedrezado y seguimiento de impactos
- **Log de batalla** en tiempo real
- **Estadísticas** al finalizar: disparos, impactos, precisión
- Diseño militar / retro-futurista responsive

## 🚀 Cómo jugar

1. Abre `index.html` en tu navegador (no necesita servidor)
2. **Coloca tus barcos** — haz clic en un barco del panel derecho, luego clic en el tablero
3. **Clic derecho** en el tablero para rotar el barco actual
4. Presiona **¡LISTO!** cuando hayas colocado todos
5. **Ataca** el tablero enemigo haciendo clic en las celdas
6. ¡El primero en hundir los 5 barcos enemigos gana!

## 📁 Estructura

```
batalla-naval/
├── index.html   # Estructura de la app
├── style.css    # Diseño naval oscuro
├── game.js      # Lógica del juego
└── README.md
```

## 🌐 Demo local

```bash
# Opción 1: abrir directo
open index.html

# Opción 2: con servidor (Python)
python3 -m http.server 8080

# Opción 3: con Node
npx serve .
```

## 🖥️ Subir a GitHub Pages

```bash
git init
git add .
git commit -m "feat: batalla naval inicial"
git remote add origin https://github.com/TU_USUARIO/batalla-naval.git
git push -u origin main
```

Luego en GitHub: **Settings → Pages → Source: main branch** y tu juego estará en línea.
