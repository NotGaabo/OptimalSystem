/**
 * generate-projects.js
 * ─────────────────────────────────────────────────────
 * Corre este script UNA VEZ antes de subir a Vercel:
 *
 *   node generate-projects.js
 *
 * Escanea:
 *   uploads/logos/<projectId>/<cualquier-archivo>  → campo "logo" en el JSON
 *   uploads/<projectId>/                           → campo "images" en el JSON
 *
 * El nombre del archivo de logo no importa, toma el primero que encuentre.
 * ─────────────────────────────────────────────────────
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── __dirname EN ES MODULES ──────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── CONFIG BASE DE PROYECTOS ─────────────────────────
const BASE_PROJECTS = [
  {
    id: 'smartops',
    name: 'SmartOps',
    tagline: 'Infraestructura inteligente, control total',
    description: 'Plataforma completa para gestionar proyectos de automatización inteligente, dispositivos, tareas y operaciones con control de acceso por roles. Diseñada para equipos que operan infraestructura smart.',
    icon: '⚡',
    color: '#2D6FFF',
    colorGlow: 'rgba(45,111,255,0.25)',
    tags: ['Automatización', 'RBAC', 'IoT'],
    tagColors: ['blue', 'dark', 'dark'],
    tech: ['React', 'Node.js', 'RBAC'],
    github: 'https://github.com/brxnzy/SmartOps',
  },
  {
    id: 'billnova',
    name: 'BillNova',
    tagline: 'Gestión empresarial centralizada y accesible',
    description: 'Plataforma para la gestión empresarial de forma fácil y organizada. Centraliza contabilidad, inventario, ventas, compras, facturación y administración en un solo sistema accesible para todo el equipo.',
    icon: '🏘️',
    color: '#3458ae',
    colorGlow: 'rgba(52,88,174,0.25)',
    tags: ['Gestión empresarial', 'Contabilidad'],
    tagColors: ['green', 'dark'],
    tech: ['Web App', 'Dashboard', 'Notificaciones'],
    github: 'https://github.com/brxnzy/Urbane',
  },
  {
    id: 'schooltime',
    name: 'SchoolTime',
    tagline: 'Administración educativa sin fricciones',
    description: 'Sistema web para la gestión de horarios, asistencia y comunicaciones en instituciones educativas. Facilita la administración de estudiantes, docentes y actividades escolares.',
    icon: '🎓',
    color: '#2768F7',
    colorGlow: 'rgba(39,104,247,0.25)',
    tags: ['Web App', 'Educación', 'Gestión'],
    tagColors: ['purple', 'dark', 'dark'],
    tech: ['Generación Automática', 'Asistencia', 'Comunicaciones'],
    github: 'https://github.com/NotGaabo/U-Park',
  },
];

// Extensiones aceptadas
const LOGO_EXTS  = new Set(['.svg', '.png', '.webp', '.jpg', '.jpeg']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

// ── BUSCAR LOGO ──────────────────────────────────────
// Toma el PRIMER archivo con extensión de imagen dentro de
// uploads/logos/<projectId>/  (el nombre del archivo no importa).
// Devuelve la ruta relativa o null si la carpeta no existe / está vacía.
function findLogo(projectId) {
  const logoDir = path.join(__dirname, 'uploads', 'logos', projectId);
  if (!fs.existsSync(logoDir)) return null;

  const files = fs.readdirSync(logoDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return LOGO_EXTS.has(ext) && !f.startsWith('.');
  });

  if (files.length === 0) return null;

  // Si hay varios, preferir SVG > PNG > WEBP > JPG
  const priority = ['.svg', '.png', '.webp', '.jpg', '.jpeg'];
  files.sort((a, b) => {
    const ia = priority.indexOf(path.extname(a).toLowerCase());
    const ib = priority.indexOf(path.extname(b).toLowerCase());
    return ia - ib;
  });

  return `uploads/logos/${projectId}/${files[0]}`;
}

// ── BUSCAR IMÁGENES DEL PROYECTO ─────────────────────
function sortImages(files) {
  return files.sort((a, b) => {
    const na = parseInt(path.parse(a).name, 10);
    const nb = parseInt(path.parse(b).name, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function scanImages(projectId) {
  const dir = path.join(__dirname, 'uploads', projectId);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.has(ext) && !f.startsWith('.');
  });

  return sortImages(files).map(f => `uploads/${projectId}/${f}`);
}

// ── GENERAR JSON ─────────────────────────────────────
const projects = BASE_PROJECTS.map(p => {
  const logo   = findLogo(p.id);     // puede ser null
  const images = scanImages(p.id);
  return { ...p, logo, images };
});

const output = JSON.stringify({ projects }, null, 2);
fs.writeFileSync(path.join(__dirname, 'projects.json'), output, 'utf8');

console.log('\n✅ projects.json generado correctamente:\n');
projects.forEach(p => {
  const logoStatus  = p.logo   ? `🖼️  logo: ${p.logo}`                          : '⚠️  sin logo (se usará emoji)';
  const imgCount    = p.images.length;
  const imgStatus   = imgCount === 0 ? '⚠️  sin imágenes' : `📸 ${imgCount} imagen${imgCount > 1 ? 'es' : ''}`;

  console.log(`  ${p.icon}  ${p.name.padEnd(16)} | ${logoStatus} | ${imgStatus}`);
  p.images.forEach(img => console.log(`       └─ ${img}`));
});
console.log('\n🚀 Listo para subir a Vercel.\n');