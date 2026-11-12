import React, { useState } from "react";
import { X, ShieldCheck, FileText } from "lucide-react";

const PRIVACIDAD = [
  ["Datos que se guardan", "Esta aplicación funciona 100% en tu dispositivo. Tu nombre de perfil, progreso de lectura, favoritos y notas se almacenan únicamente en el almacenamiento local (localStorage) de tu navegador. No se crea ninguna cuenta en servidores externos."],
  ["Sin recolección", "No recopilamos, transmitimos ni vendemos datos personales. No hay analítica, rastreadores ni publicidad. La app no requiere correo electrónico ni contraseña."],
  ["Contenido externo", "Las tarjetas que enlazan a sitios de terceros (Goodreads, GitHub, editoriales, Amazon) abren esos sitios en tu navegador; sus políticas de privacidad aplican una vez que sales de esta app."],
  ["Portadas remotas", "Las portadas de algunos libros se cargan desde servidores de terceros (p. ej. Goodreads). Al mostrarlas, tu navegador hace peticiones a esos dominios."],
  ["Voz", "El modo audiolibro usa la síntesis de voz de tu propio dispositivo (Web Speech API). El texto no se envía a ningún servidor."],
  ["Borrar tus datos", "Puedes eliminar un perfil desde el selector de usuarios, o borrar todos los datos limpiando el almacenamiento del sitio en los ajustes del navegador."],
];

const TERMINOS = [
  ["Uso personal", "Esta app es una biblioteca personal con fines educativos y de lectura privada. No es un servicio comercial ni ofrece garantías de disponibilidad."],
  ["Contenido de terceros", "Los libros y recursos provienen de repositorios públicos de GitHub (rosepac, rossant, hackerkid, jbhuang0604, djsnipa1, ivuorinen) y de sus respectivos autores. Los derechos pertenecen a sus titulares; esta app solo los organiza y enlaza."],
  ["Enlaces externos", "Las entradas marcadas como «Abrir» llevan a sitios ajenos. No nos hacemos responsables del contenido, cambios o disponibilidad de esos sitios."],
  ["Propiedad", "El diseño y código de esta app son de uso personal. Las marcas, portadas y títulos mostrados pertenecen a sus respectivos propietarios."],
  ["Responsabilidad", "El software se ofrece «tal cual», sin garantía expresa o implícita. El uso que hagas del contenido enlazado es tu responsabilidad; respeta las licencias de cada obra."],
];

function Section({ items }) {
  return (
    <div className="space-y-5">
      {items.map(([t, d]) => (
        <div key={t}>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-mist">{t}</h4>
          <p className="mt-1.5 text-xs leading-relaxed text-steel-500">{d}</p>
        </div>
      ))}
    </div>
  );
}

/** Modal legal: aviso de privacidad y términos de uso. */
export default function LegalModal({ initialTab = "privacidad", onClose }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="fixed inset-0 z-[90] bg-ink/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-paper border border-steel-200 shadow-2xl animate-slideUp max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-200">
          <div className="flex gap-2">
            {[
              { id: "privacidad", label: "Privacidad", icon: ShieldCheck },
              { id: "terminos", label: "Términos", icon: FileText },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] border inline-flex items-center gap-1.5 transition-colors ${
                  tab === t.id ? "metal text-ink border-transparent" : "border-steel-300 text-steel-500 hover:text-mist"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 text-steel-500 hover:text-mist">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 safe-bottom">
          <h3 className="display text-2xl metal-text mb-5">
            {tab === "privacidad" ? "Aviso de Privacidad" : "Términos de Uso"}
          </h3>
          <Section items={tab === "privacidad" ? PRIVACIDAD : TERMINOS} />
          <p className="mt-6 pt-4 border-t border-steel-200 font-mono text-[10px] uppercase tracking-widest text-steel-400">
            Biblioteca PWA · documento informativo, versión 1.0
          </p>
        </div>
      </div>
    </div>
  );
}
